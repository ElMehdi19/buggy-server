import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm";
import User from "./User";
import Project from "./Project";
import Comment from "./Comment";

@Entity("report")
class Report extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { nullable: false })
  bug: string;

  @Column("text", { nullable: false })
  details: string;

  @Column({ name: "created_at", default: () => `date('now')` })
  created: Date;

  @Column({ name: "updated_at", default: () => `date('now')` })
  updated: Date;

  @Column({ default: "OPEN" })
  status: "OPEN" | "IN PROGRESS" | "TO BE TESTED" | "CLOSED" | "REOPEN";

  @Column({ default: "MINOR" })
  severity: "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL";

  @Column("text", { name: "reproduce_steps", nullable: false, array: true })
  reproduceSteps: string[];

  @ManyToOne(() => User, (reporter) => reporter.reports)
  reporter: User;

  @ManyToOne(() => Project, (project) => project.reports, {
    onDelete: "CASCADE",
  })
  project: Project;

  @OneToMany(() => Comment, (comment) => comment.report)
  comments: Comment[];
}

export default Report;
