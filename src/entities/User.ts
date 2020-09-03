import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
} from "typeorm";
import Report from "./Report";
import Comment from "./Comment";
import Notification from "./Notification";
import Project from "./Project";
import { projectExists } from "../controllers/project";

@Entity("users")
class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { nullable: false })
  firstName: string;

  @Column("text", { nullable: false })
  lastName: string;

  @Column("text", { nullable: false, unique: true })
  email: string;

  @Column("text", { nullable: false })
  password: string;

  @Column("text", { default: "default.png" })
  image: string;

  @OneToMany(() => Report, (report) => report.reporter)
  reports: Report[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  @Column("int", { default: 0, name: "notification_count" })
  notificationCount: number;

  @OneToMany(() => Notification, (notification) => notification.notifier)
  notificationsCreated: Notification[];

  @OneToMany(() => Project, (project) => project.manager)
  managingProjects: Project[];

  @ManyToMany(() => Project, (project) => project.users)
  projects: Project[];

  @OneToMany(() => Report, (report) => report.assignee)
  assignedIssues: Report[];
}

export default User;
