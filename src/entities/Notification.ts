import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
} from "typeorm";
import Project from "./Project";
import Report from "./Report";
import User from "./User";

@Entity()
class Notification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { default: () => `date('now')` })
  created: string;

  @Column("text", { nullable: false })
  notification: string;

  @ManyToOne(() => Project, (project) => project.notifications, {
    onDelete: "CASCADE",
  })
  project: Project;

  @ManyToOne(() => Report, (report) => report.notifications, {
    onDelete: "CASCADE",
  })
  report: Report;

  @ManyToOne(() => User, (user) => user.notificationsCreated)
  notifier: User;
}

export default Notification;
