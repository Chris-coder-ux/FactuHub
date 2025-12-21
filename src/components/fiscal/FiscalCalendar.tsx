'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, CheckCircle, Clock, Bell } from 'lucide-react';
import { format, isPast, isToday, isFuture, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

interface FiscalDeadline {
  id: string;
  quarter?: number;
  type: 'iva' | 'irpf' | 'other';
  title: string;
  description: string;
  dueDate: Date;
  status: 'upcoming' | 'due-soon' | 'overdue' | 'completed';
  daysUntil: number;
}

interface FiscalCalendarProps {
  year: number;
  deadlines: FiscalDeadline[];
  onDeadlineClick?: (deadline: FiscalDeadline) => void;
}

export function FiscalCalendar({ year, deadlines, onDeadlineClick }: FiscalCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(year);

  const currentDate = new Date(selectedYear, selectedMonth, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get deadlines for this month
  const monthDeadlines = deadlines.filter(d => {
    const deadlineMonth = d.dueDate.getMonth();
    const deadlineYear = d.dueDate.getFullYear();
    return deadlineMonth === selectedMonth && deadlineYear === selectedYear;
  });

  // Group deadlines by day
  const deadlinesByDay = monthDeadlines.reduce((acc, deadline) => {
    const day = deadline.dueDate.getDate();
    if (!acc[day]) acc[day] = [];
    acc[day].push(deadline);
    return acc;
  }, {} as Record<number, FiscalDeadline[]>);

  const getStatusColor = (status: FiscalDeadline['status']) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'due-soon':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: FiscalDeadline['status']) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-3 w-3" />;
      case 'due-soon':
        return <Clock className="h-3 w-3" />;
      case 'upcoming':
        return <Calendar className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const firstDayOfWeek = getDay(monthStart); // 0 = Sunday, 1 = Monday, etc.
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert to Monday = 0

  // Navigation
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario Fiscal
            </CardTitle>
            <CardDescription>
              {format(currentDate, 'MMMM yyyy')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              ←
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              →
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: adjustedFirstDay }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map((day) => {
            const dayNumber = day.getDate();
            const isCurrentDay = isToday(day);
            const dayDeadlines = deadlinesByDay[dayNumber] || [];
            const hasOverdue = dayDeadlines.some(d => d.status === 'overdue');
            const hasDueSoon = dayDeadlines.some(d => d.status === 'due-soon');

            return (
              <div
                key={dayNumber}
                className={`
                  aspect-square border rounded-lg p-1 cursor-pointer transition-colors
                  ${isCurrentDay ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'}
                  ${hasOverdue ? 'border-red-300 bg-red-50' : ''}
                  ${hasDueSoon && !hasOverdue ? 'border-amber-300 bg-amber-50' : ''}
                `}
                onClick={() => dayDeadlines.length > 0 && onDeadlineClick?.(dayDeadlines[0])}
              >
                <div className="flex flex-col h-full">
                  <div className={`text-xs font-medium ${isCurrentDay ? 'text-blue-600' : 'text-gray-700'}`}>
                    {dayNumber}
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 mt-1">
                    {dayDeadlines.slice(0, 2).map((deadline) => (
                      <Badge
                        key={deadline.id}
                        variant="outline"
                        className={`text-[10px] px-1 py-0 h-auto ${getStatusColor(deadline.status)}`}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(deadline.status)}
                          {deadline.title}
                        </span>
                      </Badge>
                    ))}
                    {dayDeadlines.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{dayDeadlines.length - 2} más
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
              <AlertTriangle className="h-3 w-3" />
            </Badge>
            <span>Vencido</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              <Clock className="h-3 w-3" />
            </Badge>
            <span>Próximo a vencer</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              <Calendar className="h-3 w-3" />
            </Badge>
            <span>Próximo</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle className="h-3 w-3" />
            </Badge>
            <span>Completado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

