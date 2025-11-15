import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isAfter, isBefore } from 'date-fns';

export default function PricingCalendar({ basePricePerNight, pricingCalendar = [], onDateSelect }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get price for a specific date
  const getPriceForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const customPrice = pricingCalendar.find(p => p.date === dateStr);
    
    if (customPrice) {
      return {
        price: customPrice.price,
        available: customPrice.available !== false,
        isCustom: true
      };
    }
    
    return {
      price: basePricePerNight,
      available: true,
      isCustom: false
    };
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isBefore(date, today)) return; // Can't select past dates
    
    setSelectedDate(date);
    if (onDateSelect) {
      const priceInfo = getPriceForDate(date);
      onDateSelect(date, priceInfo);
    }
  };

  const isToday = (date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(date, today);
  };

  // Get day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate offset for first day of month
  const firstDayOfMonth = monthStart.getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#1e3a5f]" />
          <h3 className="text-xl font-bold text-gray-900">Pricing Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-gray-900 min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells for offset */}
        {emptyDays.map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}
        
        {/* Date cells */}
        {daysInMonth.map(date => {
          const priceInfo = getPriceForDate(date);
          const past = isPastDate(date);
          const today = isToday(date);
          const selected = selectedDate && isSameDay(date, selectedDate);

          return (
            <button
              key={date.toString()}
              onClick={() => !past && priceInfo.available && handleDateClick(date)}
              disabled={past || !priceInfo.available}
              className={`
                aspect-square rounded-lg p-2 flex flex-col items-center justify-center
                transition-all relative
                ${past ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                ${!priceInfo.available && !past ? 'bg-red-50 text-red-400 cursor-not-allowed' : ''}
                ${priceInfo.available && !past ? 'hover:bg-[#1e3a5f]/10 cursor-pointer' : ''}
                ${today ? 'ring-2 ring-[#1e3a5f]' : ''}
                ${selected ? 'bg-[#1e3a5f] text-white hover:bg-[#2a4a7f]' : ''}
                ${priceInfo.isCustom && !selected && !past ? 'bg-[#d4af37]/10' : ''}
              `}
            >
              <span className={`text-sm font-semibold ${selected ? 'text-white' : ''}`}>
                {format(date, 'd')}
              </span>
              {priceInfo.available && !past && (
                <span className={`text-xs mt-1 ${selected ? 'text-white' : 'text-[#d4af37] font-semibold'}`}>
                  ${priceInfo.price}
                </span>
              )}
              {!priceInfo.available && !past && (
                <span className="text-xs mt-1">N/A</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white border-2 border-[#1e3a5f]" />
          <span className="text-gray-600">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#d4af37]/10" />
          <span className="text-gray-600">Custom Price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-50" />
          <span className="text-gray-600">Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100" />
          <span className="text-gray-600">Past Date</span>
        </div>
      </div>

      {/* Base price info */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Base nightly rate:</span> ${basePricePerNight}
          {pricingCalendar.length > 0 && (
            <span className="ml-2 text-gray-600">
              ({pricingCalendar.length} custom price{pricingCalendar.length !== 1 ? 's' : ''} set)
            </span>
          )}
        </p>
      </div>
    </Card>
  );
}