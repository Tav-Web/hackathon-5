"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  setMonth,
  setYear,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  parse,
  isValid,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Styled components
const Container = styled.div`
  position: relative;
  width: 100%;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 10px;
  color: #9ca3af;
  pointer-events: none;
  z-index: 1;
`;

const Input = styled.input<{ $hasValue: boolean }>`
  width: 100%;
  height: 38px;
  padding: 8px 12px 8px 36px;
  background-color: #1f2937;
  border: 1px solid #374151;
  border-radius: 6px;
  color: ${({ $hasValue }) => ($hasValue ? "#ffffff" : "#6b7280")};
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: #4b5563;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #6b7280;
  }
`;

const Dropdown = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  z-index: 9999;
  background-color: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  padding: 12px;
  min-width: 280px;
`;

const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const MonthYearSelectors = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const SelectButton = styled.button`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-transform: capitalize;

  &:hover {
    background-color: #374151;
  }
`;

const SelectDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #1f2937;
  border: 1px solid #374151;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  min-width: 100px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #1f2937;
  }

  &::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 3px;
  }
`;

const SelectOption = styled.button<{ $isSelected: boolean }>`
  display: block;
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  color: ${({ $isSelected }) => ($isSelected ? "#3b82f6" : "#ffffff")};
  background-color: ${({ $isSelected }) =>
    $isSelected ? "#374151" : "transparent"};
  border: none;
  text-align: left;
  cursor: pointer;
  text-transform: capitalize;

  &:hover {
    background-color: #374151;
  }
`;

const SelectorWrapper = styled.div`
  position: relative;
`;

const NavButton = styled.button`
  padding: 4px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #374151;
    color: #ffffff;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const WeekDays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 8px;
`;

const WeekDay = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
  padding: 4px;
  text-transform: uppercase;
`;

const Days = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
`;

const Day = styled.button<{
  $isCurrentMonth: boolean;
  $isSelected: boolean;
  $isToday: boolean;
  $isDisabled: boolean;
}>`
  padding: 8px;
  font-size: 13px;
  border: none;
  border-radius: 4px;
  cursor: ${({ $isDisabled }) => ($isDisabled ? "not-allowed" : "pointer")};
  background-color: ${({ $isSelected, $isToday }) =>
    $isSelected ? "#3b82f6" : $isToday ? "#374151" : "transparent"};
  color: ${({ $isCurrentMonth, $isSelected, $isDisabled }) =>
    $isDisabled
      ? "#4b5563"
      : $isSelected
      ? "#ffffff"
      : $isCurrentMonth
      ? "#ffffff"
      : "#6b7280"};
  opacity: ${({ $isDisabled }) => ($isDisabled ? 0.4 : 1)};

  &:hover {
    background-color: ${({ $isSelected, $isDisabled }) =>
      $isDisabled ? "transparent" : $isSelected ? "#2563eb" : "#374151"};
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #374151;
`;

const QuickButton = styled.button`
  flex: 1;
  padding: 6px 8px;
  font-size: 12px;
  background-color: #374151;
  border: none;
  border-radius: 4px;
  color: #d1d5db;
  cursor: pointer;

  &:hover {
    background-color: #4b5563;
  }
`;

// Types
interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
  disabled?: boolean;
}

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// Generate years from 2017 to current year
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= 2017; year--) {
    years.push(year);
  }
  return years;
};

const YEARS = generateYears();

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  minDate,
  maxDate,
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      return parse(value, "yyyy-MM-dd", new Date());
    }
    return new Date();
  });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showYearSelect, setShowYearSelect] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse dates
  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : null;
  const minDateObj = minDate ? parse(minDate, "yyyy-MM-dd", new Date()) : null;
  const maxDateObj = maxDate ? parse(maxDate, "yyyy-MM-dd", new Date()) : null;

  // Sync inputValue with value
  useEffect(() => {
    if (selectedDate) {
      setInputValue(format(selectedDate, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  // Mount check for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate dropdown position
  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const dropdownHeight = 380; // approximate height
      const dropdownWidth = 280;

      let top = rect.bottom + 4;
      let left = rect.left;

      // Check if dropdown would go off-screen bottom
      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 4;
      }

      // Check if dropdown would go off-screen right
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      // Ensure left is not negative
      if (left < 8) {
        left = 8;
      }

      setDropdownPosition({ top, left });
    }
  }, []);

  // Update position when opening
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const isDateDisabled = (date: Date): boolean => {
    if (minDateObj && isBefore(date, minDateObj)) return true;
    if (maxDateObj && isAfter(date, maxDateObj)) return true;
    return false;
  };

  const handleSelectDate = (date: Date) => {
    if (isDateDisabled(date)) return;
    onChange(format(date, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleQuickSelect = (daysAgo: number) => {
    const date = addDays(new Date(), -daysAgo);
    if (!isDateDisabled(date)) {
      onChange(format(date, "yyyy-MM-dd"));
      setIsOpen(false);
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIndex));
    setShowMonthSelect(false);
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setShowYearSelect(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Remove non-numeric characters except /
    val = val.replace(/[^\d/]/g, "");

    // Auto-add slashes
    if (val.length === 2 && inputValue.length < 2) {
      val += "/";
    } else if (val.length === 5 && inputValue.length < 5) {
      val += "/";
    }

    // Limit to 10 characters (dd/mm/yyyy)
    val = val.slice(0, 10);

    setInputValue(val);

    // Try to parse the date if complete
    if (val.length === 10) {
      const parsed = parse(val, "dd/MM/yyyy", new Date());
      if (isValid(parsed) && !isDateDisabled(parsed)) {
        onChange(format(parsed, "yyyy-MM-dd"));
        setCurrentMonth(parsed);
      }
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Validate on blur
    if (inputValue && inputValue.length === 10) {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (!isValid(parsed) || isDateDisabled(parsed)) {
        // Reset to previous valid value
        if (selectedDate) {
          setInputValue(format(selectedDate, "dd/MM/yyyy"));
        } else {
          setInputValue("");
        }
      }
    } else if (inputValue && inputValue.length < 10) {
      // Incomplete date, reset
      if (selectedDate) {
        setInputValue(format(selectedDate, "dd/MM/yyyy"));
      } else {
        setInputValue("");
      }
    }
  };

  const displayValue = selectedDate
    ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
    : placeholder;

  const dropdownContent = (
    <Dropdown
      ref={dropdownRef}
      $top={dropdownPosition.top}
      $left={dropdownPosition.left}
    >
      <CalendarHeader>
        <NavButton onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </NavButton>
        <MonthYearSelectors>
          <SelectorWrapper>
            <SelectButton
              onClick={() => {
                setShowMonthSelect(!showMonthSelect);
                setShowYearSelect(false);
              }}
            >
              {format(currentMonth, "MMMM", { locale: ptBR })}
              <ChevronDown className="h-3 w-3" />
            </SelectButton>
            {showMonthSelect && (
              <SelectDropdown>
                {MONTHS.map((month, idx) => (
                  <SelectOption
                    key={month}
                    $isSelected={currentMonth.getMonth() === idx}
                    onClick={() => handleMonthSelect(idx)}
                  >
                    {month}
                  </SelectOption>
                ))}
              </SelectDropdown>
            )}
          </SelectorWrapper>
          <SelectorWrapper>
            <SelectButton
              onClick={() => {
                setShowYearSelect(!showYearSelect);
                setShowMonthSelect(false);
              }}
            >
              {currentMonth.getFullYear()}
              <ChevronDown className="h-3 w-3" />
            </SelectButton>
            {showYearSelect && (
              <SelectDropdown>
                {YEARS.map((year) => (
                  <SelectOption
                    key={year}
                    $isSelected={currentMonth.getFullYear() === year}
                    onClick={() => handleYearSelect(year)}
                  >
                    {year}
                  </SelectOption>
                ))}
              </SelectDropdown>
            )}
          </SelectorWrapper>
        </MonthYearSelectors>
        <NavButton onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </NavButton>
      </CalendarHeader>

      <WeekDays>
        {WEEK_DAYS.map((weekDay) => (
          <WeekDay key={weekDay}>{weekDay}</WeekDay>
        ))}
      </WeekDays>

      <Days>
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const isDisabled = isDateDisabled(day);

          return (
            <Day
              key={idx}
              onClick={() => handleSelectDate(day)}
              $isCurrentMonth={isCurrentMonth}
              $isSelected={!!isSelected}
              $isToday={isToday}
              $isDisabled={isDisabled}
              disabled={isDisabled}
            >
              {format(day, "d")}
            </Day>
          );
        })}
      </Days>

      <QuickActions>
        <QuickButton onClick={() => handleQuickSelect(0)}>Hoje</QuickButton>
        <QuickButton onClick={() => handleQuickSelect(30)}>
          30 dias atrás
        </QuickButton>
        <QuickButton onClick={() => handleQuickSelect(365)}>
          1 ano atrás
        </QuickButton>
      </QuickActions>
    </Dropdown>
  );

  return (
    <Container ref={containerRef}>
      <InputWrapper>
        <InputIcon>
          <Calendar className="h-4 w-4" />
        </InputIcon>
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          $hasValue={!!selectedDate}
          disabled={disabled}
        />
      </InputWrapper>

      {isMounted && isOpen && createPortal(dropdownContent, document.body)}
    </Container>
  );
}
