/**
 * Date helpers used by the ranking module (and anywhere else that needs
 * calendar-boundary math). All helpers return *local* midnight — matching
 * the convention already used by `streakService`.
 */

export const startOfDay = (input: Date = new Date()): Date => {
    const d = new Date(input)
    d.setHours(0, 0, 0, 0)
    return d
}

export const startOfTomorrow = (input: Date = new Date()): Date => {
    const d = startOfDay(input)
    d.setDate(d.getDate() + 1)
    return d
}

/**
 * Monday 00:00 of the calendar week that `input` belongs to (ISO week).
 * Sunday is treated as the *last* day of the previous week.
 */
export const startOfIsoWeek = (input: Date = new Date()): Date => {
    const d = startOfDay(input)
    const dow = d.getDay() // 0 = Sun, 1 = Mon, ...
    const offsetToMonday = dow === 0 ? -6 : 1 - dow
    d.setDate(d.getDate() + offsetToMonday)
    return d
}

export const startOfMonth = (input: Date = new Date()): Date => {
    const d = startOfDay(input)
    d.setDate(1)
    return d
}

/**
 * Compare two `Date` values ignoring the time component. Returns true when
 * both represent the same calendar day.
 */
export const isSameCalendarDay = (a: Date | null | undefined, b: Date | null | undefined): boolean => {
    if (!a || !b) return false
    return startOfDay(a).getTime() === startOfDay(b).getTime()
}
