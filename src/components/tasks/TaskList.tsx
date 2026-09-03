import { CalendarClock, UserCog } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import type { CaseTask } from "@/domain/rental"
import { formatShortDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface TaskListProps {
  tasks: readonly CaseTask[]
  onToggle: (taskId: string, completed: boolean) => void
}

export function TaskList({ tasks, onToggle }: TaskListProps) {
  const completed = tasks.filter((t) => t.completed).length
  const percent = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100)

  return (
    <section aria-labelledby="oppgaver-tittel" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 id="oppgaver-tittel" className="text-lg font-semibold">
          Oppgaver
        </h3>
        <span className="text-sm text-muted-foreground">
          {completed} av {tasks.length} ferdig
        </span>
      </div>
      <Progress
        value={percent}
        className="h-2"
        aria-label={`${percent} % av oppgavene er ferdige`}
      />
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => {
          const checkboxId = `task-${task.id}`
          return (
            <li
              key={task.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3.5 transition-colors",
                task.completed
                  ? "border-success-border bg-success-soft/50"
                  : "border-border bg-card",
              )}
            >
              <Checkbox
                id={checkboxId}
                checked={task.completed}
                onCheckedChange={(checked) => onToggle(task.id, checked === true)}
                className="mt-0.5"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    "cursor-pointer text-base font-medium leading-snug",
                    task.completed && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <UserCog className="size-4" aria-hidden="true" />
                    {task.responsibleRole}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="size-4" aria-hidden="true" />
                    Frist {formatShortDate(task.dueDate)}
                  </span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
