import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from "typeorm";
import User from "./User";
import Report from "./Report";

@Entity()
class Comment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { nullable: false })
  content: string;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: "CASCADE" })
  author: User;

  @ManyToOne(() => Report, (report) => report.comments, { onDelete: "CASCADE" })
  report: Report;

  @Column({ name: "update_at", default: () => `date('now')` })
  posted: Date;
}

export default Comment;
