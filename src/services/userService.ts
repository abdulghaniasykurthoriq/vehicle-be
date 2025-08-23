import { DB } from "../db";

export class UserService {
  constructor(private db: DB) {}

  list() {
    return this.db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }
  get(id: string) {
    return this.db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });
  }
  create(data: {
    email: string;
    name?: string;
    passwordHash: string;
    role?: string;
  }) {
    return this.db.user.create({ data });
  }
  update(id: string, data: { email?: string; name?: string; role?: string }) {
    return this.db.user.update({ where: { id }, data });
  }
  delete(id: string) {
    return this.db.user.delete({ where: { id } });
  }
}
