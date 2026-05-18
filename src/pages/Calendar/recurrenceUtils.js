/**
 * Parse monthly recurrence_rule from DB (e.g. "15", "1Su", "2MO", "-1SU").
 * Returns null if the rule is not a recognized monthly pattern.
 */
export const parseMonthlyRecurrenceRule = (rule) => {
  if (rule == null || rule === "") return null;

  const trimmed = String(rule).trim();

  if (/^\d+$/.test(trimmed)) {
    return {
      recurrenceMonthOption: "DAY",
      recurrenceMonthDay: parseInt(trimmed, 10),
      recurrenceWeekNumber: 1,
      recurrenceWeekDay: "MO",
    };
  }

  const match = trimmed.match(/^(-?\d+)([A-Za-z]{2})$/i);
  if (match) {
    return {
      recurrenceMonthOption: "WEEKLY",
      recurrenceMonthDay: 1,
      recurrenceWeekNumber: parseInt(match[1], 10),
      recurrenceWeekDay: match[2].toUpperCase(),
    };
  }

  return null;
};

export const getMonthlyRecurrenceFields = (task, defaultMonthDay = 1) => {
  const isMonthly = task?.recurrenceType?.toUpperCase() === "MONTHLY";
  const fromRule =
    isMonthly && task?.recurrenceRule
      ? parseMonthlyRecurrenceRule(task.recurrenceRule)
      : null;

  if (!isMonthly) {
    return {
      recurrenceMonthOption: "DAY",
      recurrenceMonthDay: defaultMonthDay,
      recurrenceWeekNumber: 1,
      recurrenceWeekDay: "MO",
    };
  }

  return {
    recurrenceMonthOption:
      task?.recurrenceMonthOption ?? fromRule?.recurrenceMonthOption ?? "DAY",
    recurrenceMonthDay:
      task?.recurrenceMonthDay ?? fromRule?.recurrenceMonthDay ?? defaultMonthDay,
    recurrenceWeekNumber:
      task?.recurrenceWeekNumber ?? fromRule?.recurrenceWeekNumber ?? 1,
    recurrenceWeekDay:
      task?.recurrenceWeekDay ?? fromRule?.recurrenceWeekDay ?? "MO",
  };
};
