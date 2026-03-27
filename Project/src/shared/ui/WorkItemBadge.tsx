import {
  type WorkItemPriority,
  type WorkItemStatus,
  workItemPriorityClassName,
  workItemStatusClassName,
  workItemStatusLabel,
} from "@shared/lib/workItemPresentation";

type PriorityBadgeProps = {
  value: WorkItemPriority;
};

type StatusBadgeProps = {
  value: WorkItemStatus;
};

export function PriorityBadge({ value }: PriorityBadgeProps) {
  return <span className={workItemPriorityClassName[value]}>{value}</span>;
}

export function StatusBadge({ value }: StatusBadgeProps) {
  return <span className={workItemStatusClassName[value]}>{workItemStatusLabel[value]}</span>;
}
