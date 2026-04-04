import { addDays, format, isAfter, startOfDay } from 'date-fns';

export interface SchedulePattern {
    dayOfWeek: number; // 2=Monday, ..., 8=Sunday
    startShift: number;
    endShift: number;
    roomId: string | null;
    type: string;
}

export class SessionGenerator {
    /**
     * Generates discrete dates for a specific day of the week between two dates
     */
    static generateDates(startDate: Date, endDate: Date, dayOfWeek: number): Date[] {
        const dates: Date[] = [];
        let current = startOfDay(startDate);
        const end = startOfDay(endDate);

        // Adjust dayOfWeek from UNETI (2=Mon) to date-fns (1=Mon)
        // UNETI: 2, 3, 4, 5, 6, 7, 8 (CN)
        // Date-fns: 1, 2, 3, 4, 5, 6, 0 (CN)
        const targetDay = dayOfWeek === 8 ? 0 : dayOfWeek - 1;

        while (!isAfter(current, end)) {
            if (current.getDay() === targetDay) {
                dates.push(new Date(current));
            }
            current = addDays(current, 1);
        }

        return dates;
    }

    /**
     * Maps ClassSchedule patterns to ClassSession data
     */
    static generateSessionsData(
        courseClassId: string,
        semesterId: string,
        startDate: Date,
        endDate: Date,
        schedules: SchedulePattern[]
    ) {
        const sessions = [];

        for (const schedule of schedules) {
            const occurrenceDates = this.generateDates(startDate, endDate, schedule.dayOfWeek);
            
            for (const date of occurrenceDates) {
                sessions.push({
                    courseClassId,
                    semesterId,
                    roomId: schedule.roomId,
                    date,
                    startShift: schedule.startShift,
                    endShift: schedule.endShift,
                    type: schedule.type,
                    note: `Lịch định kỳ: ${schedule.type}`
                });
            }
        }

        return sessions;
    }
}
