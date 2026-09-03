/**
 * Servicio de Carpetas.
 * Gestiona el árbol de carpetas (jerarquía) donde se organizan los documentos.
 * Las carpetas son compartidas por toda la empresa.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';

@Injectable()
export class FoldersService {
  constructor(private prisma: PrismaService) {}

  /** Crea una carpeta (en la raíz o dentro de otra). */
  async create(dto: CreateFolderDto) {
    if (dto.parentId != null) await this.ensureExists(dto.parentId);
    return this.prisma.carpeta.create({
      data: { nombre: dto.nombre.trim(), parentId: dto.parentId ?? null },
    });
  }

  /**
   * Devuelve el contenido de una carpeta: subcarpetas y documentos que
   * contiene, más las "migas de pan" (ruta desde la raíz) para navegar.
   * Si `parentId` es null, devuelve el contenido de la raíz.
   */
  async contents(parentId: number | null) {
    if (parentId != null) await this.ensureExists(parentId);

    const [subcarpetas, documentos, breadcrumb, carpeta] = await Promise.all([
      this.prisma.carpeta.findMany({
        where: { parentId },
        orderBy: { nombre: 'asc' },
        include: { _count: { select: { hijos: true, documents: true } } },
      }),
      this.prisma.document.findMany({
        where: { folderId: parentId },
        include: { signatory: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.breadcrumb(parentId),
      parentId != null
        ? this.prisma.carpeta.findUnique({ where: { id: parentId } })
        : Promise.resolve(null),
    ]);

    return { carpeta, breadcrumb, subcarpetas, documentos };
  }

  /** Árbol completo de carpetas (para el panel lateral). */
  async tree() {
    const all = await this.prisma.carpeta.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { hijos: true, documents: true } } },
    });
    // Armamos el árbol en memoria (evita N consultas recursivas).
    type Nodo = (typeof all)[number] & { hijos: Nodo[] };
    const byId = new Map<number, Nodo>();
    all.forEach((c) => byId.set(c.id, { ...c, hijos: [] }));
    const raiz: Nodo[] = [];
    byId.forEach((nodo) => {
      if (nodo.parentId != null && byId.has(nodo.parentId)) {
        byId.get(nodo.parentId)!.hijos.push(nodo);
      } else {
        raiz.push(nodo);
      }
    });
    return raiz;
  }

  /** Migas de pan: [raíz…, carpeta actual]. Vacío si es la raíz. */
  async breadcrumb(id: number | null) {
    const ruta: { id: number; nombre: string }[] = [];
    let actual = id;
    // Recorremos hacia arriba por los padres (con tope de seguridad).
    for (let i = 0; actual != null && i < 100; i++) {
      const c = await this.prisma.carpeta.findUnique({
        where: { id: actual },
        select: { id: true, nombre: true, parentId: true },
      });
      if (!c) break;
      ruta.unshift({ id: c.id, nombre: c.nombre });
      actual = c.parentId;
    }
    return ruta;
  }

  /** Renombra y/o mueve una carpeta. */
  async update(id: number, dto: UpdateFolderDto) {
    await this.ensureExists(id);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Una carpeta no puede contenerse a sí misma.');
      }
      await this.ensureExists(dto.parentId);
      // Evitar ciclos: el nuevo padre no puede ser un descendiente de la carpeta.
      const descendientes = await this.descendantIds(id);
      if (descendientes.includes(dto.parentId)) {
        throw new BadRequestException(
          'No puedes mover una carpeta dentro de una de sus subcarpetas.',
        );
      }
    }

    return this.prisma.carpeta.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
      },
    });
  }

  /**
   * Elimina una carpeta y todas sus subcarpetas. Los documentos NO se borran:
   * se mueven a la raíz (folderId = null) para no perder PDFs.
   */
  async remove(id: number) {
    await this.ensureExists(id);
    const ids = [id, ...(await this.descendantIds(id))];
    // 1) Rescatamos los documentos a la raíz.
    await this.prisma.document.updateMany({
      where: { folderId: { in: ids } },
      data: { folderId: null },
    });
    // 2) Borramos la carpeta (las subcarpetas caen en cascada).
    await this.prisma.carpeta.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** IDs de todas las subcarpetas (a cualquier profundidad) de una carpeta. */
  private async descendantIds(id: number): Promise<number[]> {
    const resultado: number[] = [];
    let frontera = [id];
    for (let i = 0; frontera.length && i < 100; i++) {
      const hijos = await this.prisma.carpeta.findMany({
        where: { parentId: { in: frontera } },
        select: { id: true },
      });
      frontera = hijos.map((h) => h.id);
      resultado.push(...frontera);
    }
    return resultado;
  }

  private async ensureExists(id: number) {
    const c = await this.prisma.carpeta.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Carpeta no encontrada');
    return c;
  }
}
