export const EnrollmentChart = ({ trends }: { trends: any[] }) => {
    // Determine the max for scaling out of 3000 roughly based on highest value to keep chart dynamic
    const maxVal = Math.max(...trends.map(t => t.enrollments), 1);
    const chartMax = Math.ceil(maxVal * 1.2); // 20% headroom

    return (
        <div className="h-48 w-full flex items-end justify-between gap-2 px-2">
            {trends.map((trend, i) => {
                const height = (trend.enrollments / chartMax) * 100;
                return (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group" title={`${trend.name}: ${trend.enrollments}`}>
                        <div
                            className="w-full bg-blue-100 rounded-t-sm relative group-hover:bg-blue-200 transition-all flex items-end justify-center"
                            style={{ height: `${height}%`, minHeight: '5px' }}
                        >
                            <span className="text-[10px] text-blue-600 font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {trend.enrollments}
                            </span>
                            <div className="absolute top-0 right-0 w-full h-1 bg-blue-500 rounded-full"></div>
                        </div>
                        <span className="text-xs text-gray-400 mt-1">{trend.name}</span>
                    </div>
                )
            })}
        </div>
    );
};

export const AttendancePieChart = ({ distribution, rate }: { distribution: any[], rate: number }) => {
    // Calculate total to do percentages for stroke-dasharray
    const total = distribution.reduce((sum, item) => sum + item.value, 0) || 1;
    let currentOffset = 0;
    const circumference = 251.2; // 2 * PI * r (approx 40 * 6.28)

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-48 mx-auto">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {distribution.map((item, i) => {
                        const percentage = item.value / total;
                        const strokeDasharray = `${percentage * circumference} ${circumference}`;
                        const strokeDashoffset = -currentOffset;
                        currentOffset += percentage * circumference;

                        // Ensure we always render a tiny bit if there's > 0 value otherwise it looks broken if all are 0
                        const actualStroke = item.value === 0 && total === 1 ? '0 251' : strokeDasharray;

                        return (
                            <circle
                                key={i}
                                cx="50"
                                cy="50"
                                r="40"
                                stroke={item.color}
                                strokeWidth="20"
                                fill="none"
                                strokeDasharray={actualStroke}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all hover:stroke-[25px] cursor-pointer"
                            >
                                <title>{`${item.name}: ${item.value}`}</title>
                            </circle>
                        );
                    })}
                    {/* Background circle if everything is 0 */}
                    {total === 1 && distribution[0].value === 0 && (
                        <circle cx="50" cy="50" r="40" stroke="#f3f4f6" strokeWidth="20" fill="none" />
                    )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-2xl font-bold text-gray-800">{rate}%</span>
                    <span className="text-xs text-gray-500">Rate</span>
                </div>
            </div>

            {/* Legend */}
            <div className="w-full grid grid-cols-2 gap-2 text-xs">
                {distribution.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-600 flex-1">{item.name}</span>
                        <span className="font-bold text-gray-800">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
