import React, { useState, useEffect } from 'react';
import { Clock, Users, Calendar, CheckCircle, XCircle, AlertCircle, Plus, Save, Edit2, Trash2 } from 'lucide-react';

// JSON File Storage Manager
class JSONStorage {
  constructor() {
    this.dataFile = 'shift-app-data.json';
  }

  // Check if running in browser environment
  isBrowser() {
    return typeof window !== 'undefined';
  }

  // Save data to JSON file (simulated with localStorage for browser)
  async saveData(data) {
    if (this.isBrowser()) {
      try {
        const jsonString = JSON.stringify(data, null, 2);
        localStorage.setItem('shiftAppData', jsonString);
        
        // Also trigger download for backup
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        return { success: true, data };
      } catch (error) {
        console.error('Error saving data:', error);
        return { success: false, error: error.message };
      }
    }
  }

  // Load data from JSON file
  async loadData() {
    if (this.isBrowser()) {
      try {
        const jsonString = localStorage.getItem('shiftAppData');
        if (jsonString) {
          const data = JSON.parse(jsonString);
          return { success: true, data };
        }
        // Return default structure if no data exists
        return {
          success: true,
          data: {
            employees: [],
            roles: [],
            shifts: [],
            schedule: {},
            attendance: {},
            shiftHistory: {}
          }
        };
      } catch (error) {
        console.error('Error loading data:', error);
        return {
          success: true,
          data: {
            employees: [],
            roles: [],
            shifts: [],
            schedule: {},
            attendance: {},
            shiftHistory: {}
          }
        };
      }
    }
  }

  // Update specific section of data
  async updateSection(section, data) {
    const currentData = await this.loadData();
    if (currentData.success) {
      currentData.data[section] = data;
      return await this.saveData(currentData.data);
    }
    return { success: false, error: 'Failed to load current data' };
  }

  // Clear all data
  async clearData() {
    if (this.isBrowser()) {
      localStorage.removeItem('shiftAppData');
      return { success: true };
    }
  }

  // Export data as downloadable JSON
  exportData(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shift-app-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Import data from JSON file
  async importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const result = await this.saveData(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

const storage = new JSONStorage();

const ShiftAttendanceApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [attendance, setAttendance] = useState({});
  const [leaveRequests, setLeaveRequests] = useState({});
  const [shiftHistory, setShiftHistory] = useState({});

  // Load data from JSON storage on mount
  useEffect(() => {
    const loadInitialData = async () => {
      const result = await storage.loadData();
      if (result.success && result.data) {
        setEmployees(result.data.employees || []);
        setRoles(result.data.roles || []);
        setShifts(result.data.shifts || []);
        setSchedule(result.data.schedule || {});
        setAttendance(result.data.attendance || {});
        setShiftHistory(result.data.shiftHistory || {});
        setLeaveRequests(result.data.leaveRequests || {});
      }
    };
    loadInitialData();
  }, []);

  // Save data to JSON storage whenever it changes
  useEffect(() => {
    const saveData = async () => {
      const dataToSave = {
        employees,
        roles,
        shifts,
        schedule,
        attendance,
        shiftHistory,
        leaveRequests,
        lastUpdated: new Date().toISOString()
      };
      await storage.saveData(dataToSave);
    };
    
    // Only save if we have any data
    if (employees.length > 0 || roles.length > 0 || shifts.length > 0) {
      saveData();
    }
  }, [employees, roles, shifts, schedule, attendance, shiftHistory, leaveRequests]);
  
  // Forms state
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  
  const [employeeForm, setEmployeeForm] = useState({
    id: '', name: '', roleId: '', weeklyHours: 40, dailyMaxHours: 8, skills: '', shiftsPerWeek: 5
  });
  
  const [roleForm, setRoleForm] = useState({
    id: '', name: '', weekendRequired: false, requiredSkills: '', breakMinutes: 60
  });
  
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [attendanceTime, setAttendanceTime] = useState({});
  const [selectedEmployeeForLeave, setSelectedEmployeeForLeave] = useState(null);
  
  const [shiftForm, setShiftForm] = useState({
    id: '', name: '', startTime: '09:00', endTime: '17:00', roleId: '', daysOfWeek: [], priority: 50
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [currentWeek, setCurrentWeek] = useState(getWeekDates());

  // Auto-calculate shifts per week based on weekly hours and daily max
  const calculateShiftsPerWeek = (weeklyHours, dailyMaxHours) => {
    if (!weeklyHours || !dailyMaxHours) return 5;
    return Math.ceil(weeklyHours / dailyMaxHours);
  };

  // Sort employees by role
  const getSortedEmployees = () => {
    return [...employees].sort((a, b) => {
      const roleA = roles.find(r => r.id === a.roleId);
      const roleB = roles.find(r => r.id === b.roleId);
      const roleNameA = roleA?.name || '';
      const roleNameB = roleB?.name || '';
      if (roleNameA !== roleNameB) return roleNameA.localeCompare(roleNameB);
      return a.name.localeCompare(b.name);
    });
  };

  function getWeekDates() {
    const today = new Date();
    const first = today.getDate() - today.getDay() + 1;
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(today.setDate(first + i));
      week.push(day.toISOString().split('T')[0]);
    }
    return week;
  }

  // Add/Edit Employee
  const saveEmployee = () => {
    if (!employeeForm.name || !employeeForm.roleId) {
      alert('Please fill required fields');
      return;
    }
    
    const shiftsPerWeek = calculateShiftsPerWeek(employeeForm.weeklyHours, employeeForm.dailyMaxHours);
    
    const employeeData = {
      ...employeeForm,
      shiftsPerWeek,
      skills: employeeForm.skills.split(',').map(s => s.trim()).filter(s => s)
    };
    
    if (editingEmployee) {
      setEmployees(employees.map(e => e.id === editingEmployee.id ? employeeData : e));
      setEditingEmployee(null);
    } else {
      setEmployees([...employees, { ...employeeData, id: Date.now().toString() }]);
    }
    setEmployeeForm({ id: '', name: '', roleId: '', weeklyHours: 40, dailyMaxHours: 8, skills: '', shiftsPerWeek: 5 });
    setShowEmployeeForm(false);
  };

  const deleteEmployee = (id) => {
    if (confirm('Delete this employee?')) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  // Add/Edit Role
  const saveRole = () => {
    if (!roleForm.name) {
      alert('Please enter role name');
      return;
    }
    const roleData = {
      ...roleForm,
      requiredSkills: roleForm.requiredSkills.split(',').map(s => s.trim()).filter(s => s)
    };
    
    if (editingRole) {
      setRoles(roles.map(r => r.id === editingRole.id ? roleData : r));
      setEditingRole(null);
    } else {
      setRoles([...roles, { ...roleData, id: Date.now().toString() }]);
    }
    setRoleForm({ id: '', name: '', weekendRequired: false, requiredSkills: '', breakMinutes: 60 });
    setShowRoleForm(false);
  };

  const deleteRole = (id) => {
    if (confirm('Delete this role?')) {
      setRoles(roles.filter(r => r.id !== id));
    }
  };

  // Add/Edit Shift
  const saveShift = () => {
    if (!shiftForm.name || !shiftForm.roleId || shiftForm.daysOfWeek.length === 0) {
      alert('Please fill all required fields');
      return;
    }
    const role = roles.find(r => r.id === shiftForm.roleId);
    const shiftData = {
      ...shiftForm,
      hours: calculateShiftHours(shiftForm.startTime, shiftForm.endTime, role?.breakMinutes || 0)
    };
    
    if (editingShift) {
      setShifts(shifts.map(s => s.id === editingShift.id ? shiftData : s));
      setEditingShift(null);
    } else {
      setShifts([...shifts, { ...shiftData, id: Date.now().toString() }]);
    }
    setShiftForm({ id: '', name: '', startTime: '09:00', endTime: '17:00', roleId: '', daysOfWeek: [] });
    setShowShiftForm(false);
  };

  const deleteShift = (id) => {
    if (confirm('Delete this shift?')) {
      setShifts(shifts.filter(s => s.id !== id));
    }
  };

  const calculateShiftHours = (start, end, breakMinutes = 0) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let minutes = (eh * 60 + em - sh * 60 - sm);
    if (minutes < 0) minutes += 24 * 60;
    minutes -= breakMinutes;
    return minutes / 60;
  };

  // Calculate how many days an employee should work based on their weekly hours
  const calculateWorkDays = (employee, shiftsInRole) => {
    if (!shiftsInRole.length) return 5;
    
    const avgShiftHours = shiftsInRole.reduce((sum, s) => sum + s.hours, 0) / shiftsInRole.length;
    const workDays = Math.ceil(employee.weeklyHours / avgShiftHours);
    return Math.min(workDays, 7);
  };

  // Generate staggered work patterns for maximum coverage
  const generateStaggeredWorkPatterns = (roleEmployees, shiftsInRole, shiftDaysNeeded) => {
    const patterns = {};
    const dayCoverage = Array(7).fill(0);
    
    // Sort employees by work days to prioritize those with fewer days
    const sortedEmployees = [...roleEmployees].sort((a, b) => {
      const aDays = calculateWorkDays(a, shiftsInRole);
      const bDays = calculateWorkDays(b, shiftsInRole);
      return aDays - bDays;
    });
    
    sortedEmployees.forEach((emp, empIndex) => {
      const workDays = calculateWorkDays(emp, shiftsInRole);
      const pattern = Array(7).fill(false);
      
      // Strategy: Stagger patterns to maximize coverage
      // Different starting points for different employees
      const offset = empIndex % 7;
      
      if (workDays === 5) {
        // Traditional Mon-Fri OR staggered to cover weekends
        if (empIndex % 3 === 0 && shiftDaysNeeded.includes('Saturday')) {
          // Pattern: Mon, Tue, Wed, Sat, Sun (covers weekend)
          [0, 1, 2, 5, 6].forEach(i => {
            pattern[i] = true;
            dayCoverage[i]++;
          });
        } else if (empIndex % 3 === 1 && shiftDaysNeeded.includes('Sunday')) {
          // Pattern: Wed, Thu, Fri, Sat, Sun (covers weekend transition)
          [2, 3, 4, 5, 6].forEach(i => {
            pattern[i] = true;
            dayCoverage[i]++;
          });
        } else {
          // Pattern: Mon, Tue, Wed, Thu, Fri (standard)
          [0, 1, 2, 3, 4].forEach(i => {
            pattern[i] = true;
            dayCoverage[i]++;
          });
        }
      } else if (workDays === 6) {
        // 6 days - rotate which day is off
        for (let i = 0; i < 7; i++) {
          if (i !== offset) {
            pattern[i] = true;
            dayCoverage[i]++;
          }
        }
      } else if (workDays === 7) {
        // All 7 days
        pattern.fill(true);
        dayCoverage.forEach((_, i) => dayCoverage[i]++);
      } else {
        // For fewer days (2-4), spread evenly but prioritize low-coverage days
        const interval = 7 / workDays;
        for (let i = 0; i < workDays; i++) {
          // Find the day with lowest coverage
          let minCoverageDay = 0;
          let minCoverage = Infinity;
          
          for (let d = 0; d < 7; d++) {
            if (!pattern[d] && dayCoverage[d] < minCoverage) {
              minCoverage = dayCoverage[d];
              minCoverageDay = d;
            }
          }
          
          // If all potential days have coverage, use interval-based spacing
          if (minCoverage === Infinity) {
            const index = Math.floor((i + offset) * interval) % 7;
            if (!pattern[index]) {
              pattern[index] = true;
              dayCoverage[index]++;
            }
          } else {
            pattern[minCoverageDay] = true;
            dayCoverage[minCoverageDay]++;
          }
        }
      }
      
      patterns[emp.id] = pattern;
    });
    
    return patterns;
  };

  // COMPLETELY REDESIGNED SCHEDULING LOGIC WITH ALL DAYS FILLED
  const generateSchedule = () => {
    const newSchedule = {};
    const employeeShiftCounts = {};
    const newShiftHistory = {...shiftHistory};
    
    // Sort employees by role for consistent processing
    const sortedEmployees = getSortedEmployees();
    
    // Initialize tracking
    sortedEmployees.forEach(emp => {
      employeeShiftCounts[emp.id] = 0;
      if (!newShiftHistory[emp.id]) {
        newShiftHistory[emp.id] = {};
      }
    });

    // STEP 1: Calculate total shifts available per role
    const roleShiftCapacity = {};
    roles.forEach(role => {
      const roleEmployees = sortedEmployees.filter(e => e.roleId === role.id);
      const totalShifts = roleEmployees.reduce((sum, emp) => {
        const shiftsPerWeek = emp.shiftsPerWeek || Math.ceil(emp.weeklyHours / emp.dailyMaxHours);
        return sum + shiftsPerWeek;
      }, 0);
      roleShiftCapacity[role.id] = totalShifts;
    });

    // STEP 2: Divide total shifts among shift types based on priority weightage
    const shiftAllocation = {};
    roles.forEach(role => {
      const roleShifts = shifts.filter(s => s.roleId === role.id);
      if (roleShifts.length === 0) return;
      
      const totalPriority = roleShifts.reduce((sum, s) => sum + (s.priority || 50), 0);
      const totalShiftsAvailable = roleShiftCapacity[role.id];
      
      shiftAllocation[role.id] = {};
      roleShifts.forEach(shift => {
        const weight = (shift.priority || 50) / totalPriority;
        const allocatedShifts = Math.round(totalShiftsAvailable * weight);
        shiftAllocation[role.id][shift.id] = allocatedShifts;
      });
    });

    // STEP 3: Create shift slots - ENSURE ALL DAYS ARE FILLED
    const allShiftSlots = [];
    
    roles.forEach(role => {
      const roleShifts = shifts.filter(s => s.roleId === role.id);
      const roleEmployees = sortedEmployees.filter(e => e.roleId === role.id);
      
      if (roleEmployees.length === 0) return;
      
      roleShifts.forEach(shift => {
        const totalAllocated = shiftAllocation[role.id]?.[shift.id] || 0;
        
        // Count how many days this shift operates
        const operatingDays = currentWeek.filter((date, idx) => 
          shift.daysOfWeek.includes(daysOfWeek[idx])
        );
        
        if (operatingDays.length === 0) return;
        
        // CRITICAL: Calculate slots per day to FILL ALL DAYS
        // Distribute the total allocated shifts evenly across all operating days
        const basePerDay = Math.floor(totalAllocated / operatingDays.length);
        const remainder = totalAllocated % operatingDays.length;
        
        // Ensure minimum of 1 employee per day if we have employees
        const minPerDay = Math.min(1, roleEmployees.length);
        
        // RANDOMIZE which days get the extra slots from remainder
        const daysToGetExtra = new Set();
        const operatingDayIndices = currentWeek
          .map((date, idx) => ({ date, idx, dayName: daysOfWeek[idx] }))
          .filter(d => shift.daysOfWeek.includes(d.dayName))
          .map(d => d.idx);
        
        // Randomly select which days get +1 slot
        const shuffledIndices = [...operatingDayIndices].sort(() => Math.random() - 0.5);
        for (let i = 0; i < remainder; i++) {
          daysToGetExtra.add(shuffledIndices[i]);
        }
        
        // Create slots for each operating day
        currentWeek.forEach((date, dayIndex) => {
          const dayName = daysOfWeek[dayIndex];
          
          if (shift.daysOfWeek.includes(dayName)) {
            // Random days get +1, not always the first days
            const getsExtra = daysToGetExtra.has(dayIndex);
            const slotsThisDay = Math.max(minPerDay, basePerDay + (getsExtra ? 1 : 0));
            
            for (let i = 0; i < slotsThisDay; i++) {
              allShiftSlots.push({
                date,
                dayIndex,
                dayName,
                shift,
                role,
                slotIndex: i,
                employeeId: null,
                filled: false,
                priority: shift.priority || 50
              });
            }
          }
        });
      });
    });

    // STEP 4: Assign employees to slots with rotation logic
    // Sort slots by date for chronological assignment
    allShiftSlots.sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return Math.random() - 0.5;
    });

    allShiftSlots.forEach(slot => {
      const roleEmployees = sortedEmployees.filter(e => e.roleId === slot.role.id);
      
      // Find eligible employees for this slot
      const eligibleEmployees = roleEmployees.filter(emp => {
        // Check if employee is on leave this day
        if (isOnLeave(emp.id, slot.date)) return false;
        
        // Check if employee has reached their weekly shift limit
        const empShiftsPerWeek = emp.shiftsPerWeek || Math.ceil(emp.weeklyHours / emp.dailyMaxHours);
        if (employeeShiftCounts[emp.id] >= empShiftsPerWeek) return false;
        
        // Check daily hours constraint
        const shiftsOnThisDay = allShiftSlots.filter(s => 
          s.filled && s.employeeId === emp.id && s.date === slot.date
        );
        const hoursOnThisDay = shiftsOnThisDay.reduce((sum, s) => sum + s.shift.hours, 0);
        
        if (hoursOnThisDay + slot.shift.hours > emp.dailyMaxHours) return false;
        
        // Check if already assigned this exact shift on this day
        const alreadyHasThisShift = shiftsOnThisDay.some(s => s.shift.id === slot.shift.id);
        if (alreadyHasThisShift) return false;
        
        // Check weekend requirement
        if (slot.dayName === 'Saturday' || slot.dayName === 'Sunday') {
          if (!slot.role.weekendRequired) return false;
        }
        
        return true;
      });

      if (eligibleEmployees.length === 0) {
        // FALLBACK: If no eligible employees with constraints, relax the shift limit
        const relaxedEligible = roleEmployees.filter(emp => {
          // Still check leave - this cannot be relaxed
          if (isOnLeave(emp.id, slot.date)) return false;
          
          const shiftsOnThisDay = allShiftSlots.filter(s => 
            s.filled && s.employeeId === emp.id && s.date === slot.date
          );
          const hoursOnThisDay = shiftsOnThisDay.reduce((sum, s) => sum + s.shift.hours, 0);
          
          if (hoursOnThisDay + slot.shift.hours > emp.dailyMaxHours) return false;
          
          const alreadyHasThisShift = shiftsOnThisDay.some(s => s.shift.id === slot.shift.id);
          if (alreadyHasThisShift) return false;
          
          if (slot.dayName === 'Saturday' || slot.dayName === 'Sunday') {
            if (!slot.role.weekendRequired) return false;
          }
          
          return true;
        });
        
        if (relaxedEligible.length === 0) return;
        
        // Use relaxed pool
        const sortedRelaxed = relaxedEligible.sort((a, b) => {
          const aShiftCount = newShiftHistory[a.id][slot.shift.id] || 0;
          const bShiftCount = newShiftHistory[b.id][slot.shift.id] || 0;
          if (aShiftCount !== bShiftCount) return aShiftCount - bShiftCount;
          return Math.random() - 0.5;
        });
        
        const selectedEmployee = sortedRelaxed[0];
        slot.employeeId = selectedEmployee.id;
        slot.filled = true;
        employeeShiftCounts[selectedEmployee.id]++;
        
        if (!newShiftHistory[selectedEmployee.id][slot.shift.id]) {
          newShiftHistory[selectedEmployee.id][slot.shift.id] = 0;
        }
        newShiftHistory[selectedEmployee.id][slot.shift.id]++;
        return;
      }

      // ROTATION LOGIC: Multi-factor sorting with randomness
      const sortedCandidates = eligibleEmployees.sort((a, b) => {
        // Factor 1: Employees who need more shifts (priority)
        const aNeeded = (a.shiftsPerWeek || 5) - employeeShiftCounts[a.id];
        const bNeeded = (b.shiftsPerWeek || 5) - employeeShiftCounts[b.id];
        if (aNeeded !== bNeeded) return bNeeded - aNeeded;
        
        // Factor 2: Who hasn't done THIS shift type recently (rotation)
        const aShiftCount = newShiftHistory[a.id][slot.shift.id] || 0;
        const bShiftCount = newShiftHistory[b.id][slot.shift.id] || 0;
        if (aShiftCount !== bShiftCount) return aShiftCount - bShiftCount;
        
        // Factor 3: Overall shift count (fairness)
        const aTotalShifts = Object.values(newShiftHistory[a.id]).reduce((sum, count) => sum + count, 0);
        const bTotalShifts = Object.values(newShiftHistory[b.id]).reduce((sum, count) => sum + count, 0);
        if (aTotalShifts !== bTotalShifts) return aTotalShifts - bTotalShifts;
        
        // Factor 4: Random for variety and equal distribution
        return Math.random() - 0.5;
      });

      // Assign the best candidate
      const selectedEmployee = sortedCandidates[0];
      slot.employeeId = selectedEmployee.id;
      slot.filled = true;
      employeeShiftCounts[selectedEmployee.id]++;
      
      if (!newShiftHistory[selectedEmployee.id][slot.shift.id]) {
        newShiftHistory[selectedEmployee.id][slot.shift.id] = 0;
      }
      newShiftHistory[selectedEmployee.id][slot.shift.id]++;
    });

    // STEP 5: Fill remaining shifts for employees who haven't reached their target
    let additionalPassNeeded = true;
    let passCount = 0;
    const maxAdditionalPasses = 5;

    while (additionalPassNeeded && passCount < maxAdditionalPasses) {
      passCount++;
      additionalPassNeeded = false;

      sortedEmployees.forEach(emp => {
        const empShiftsPerWeek = emp.shiftsPerWeek || Math.ceil(emp.weeklyHours / emp.dailyMaxHours);
        const shiftsNeeded = empShiftsPerWeek - employeeShiftCounts[emp.id];
        
        if (shiftsNeeded > 0) {
          additionalPassNeeded = true;
          const role = roles.find(r => r.id === emp.roleId);
          if (!role) return;

          const roleShifts = shifts.filter(s => s.roleId === emp.roleId);
          const sortedShifts = [...roleShifts].sort((a, b) => {
            const aCount = newShiftHistory[emp.id][a.id] || 0;
            const bCount = newShiftHistory[emp.id][b.id] || 0;
            if (aCount !== bCount) return aCount - bCount;
            return (b.priority || 50) - (a.priority || 50);
          });

          for (const shift of sortedShifts) {
            if (employeeShiftCounts[emp.id] >= empShiftsPerWeek) break;

            for (let dayIndex = 0; dayIndex < currentWeek.length; dayIndex++) {
              if (employeeShiftCounts[emp.id] >= empShiftsPerWeek) break;

              const date = currentWeek[dayIndex];
              const dayName = daysOfWeek[dayIndex];

              // Skip if employee is on leave
              if (isOnLeave(emp.id, date)) continue;

              if (!shift.daysOfWeek.includes(dayName)) continue;

              const shiftsOnThisDay = allShiftSlots.filter(s => 
                s.filled && s.employeeId === emp.id && s.date === date
              );
              const hoursOnThisDay = shiftsOnThisDay.reduce((sum, s) => sum + s.shift.hours, 0);
              
              if (hoursOnThisDay + shift.hours > emp.dailyMaxHours) continue;
              
              const alreadyHas = shiftsOnThisDay.some(s => s.shift.id === shift.id);
              if (alreadyHas) continue;

              if (dayName === 'Saturday' || dayName === 'Sunday') {
                if (!role.weekendRequired) continue;
              }

              const newSlot = {
                date,
                dayIndex,
                dayName,
                shift,
                role,
                slotIndex: 999,
                employeeId: emp.id,
                filled: true,
                priority: shift.priority || 50
              };
              allShiftSlots.push(newSlot);
              employeeShiftCounts[emp.id]++;
              
              if (!newShiftHistory[emp.id][shift.id]) {
                newShiftHistory[emp.id][shift.id] = 0;
              }
              newShiftHistory[emp.id][shift.id]++;
              break;
            }
          }
        }
      });
    }

    // STEP 6: Convert slots to schedule format
    allShiftSlots.forEach(slot => {
      if (!slot.filled) return;
      
      if (!newSchedule[slot.date]) {
        newSchedule[slot.date] = {};
      }
      if (!newSchedule[slot.date][slot.employeeId]) {
        newSchedule[slot.date][slot.employeeId] = [];
      }
      newSchedule[slot.date][slot.employeeId].push(slot.shift);
    });

    setSchedule(newSchedule);
    setShiftHistory(newShiftHistory);
  };

  // Add/Remove Leave Request
  const addLeaveRequest = (employeeId, date) => {
    const key = `${employeeId}-${date}`;
    setLeaveRequests({
      ...leaveRequests,
      [key]: { employeeId, date, status: 'approved' }
    });
  };

  const removeLeaveRequest = (employeeId, date) => {
    const key = `${employeeId}-${date}`;
    const newLeaves = { ...leaveRequests };
    delete newLeaves[key];
    setLeaveRequests(newLeaves);
  };

  const isOnLeave = (employeeId, date) => {
    const key = `${employeeId}-${date}`;
    return !!leaveRequests[key];
  };
  const markAttendance = (employeeId, date, shiftId) => {
    const key = `${employeeId}-${date}-${shiftId}`;
    const time = attendanceTime[key];
    
    if (!time) {
      alert('Please enter a time first');
      return;
    }

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    const [shiftHour, shiftMin] = shift.startTime.split(':').map(Number);
    const [timeHour, timeMin] = time.split(':').map(Number);
    
    const shiftMinutes = shiftHour * 60 + shiftMin;
    const actualMinutes = timeHour * 60 + timeMin;
    const diff = actualMinutes - shiftMinutes;

    let status = 'on-time';
    if (diff > 15) status = 'late';
    else if (diff > 0) status = 'correct';

    setAttendance({
      ...attendance,
      [key]: { employeeId, date, shiftId, time, status }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Clock className="text-blue-600" />
            Factory Shift & Attendance Manager
          </h1>
          <p className="text-gray-600 mt-2">Manage shifts, schedules, and attendance tracking</p>
        </header>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex gap-2 p-2">
            {['dashboard', 'employees', 'roles', 'shifts', 'schedule'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Total Employees</p>
                    <p className="text-3xl font-bold text-blue-600">{employees.length}</p>
                  </div>
                  <Users className="text-blue-600" size={48} />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Active Roles</p>
                    <p className="text-3xl font-bold text-green-600">{roles.length}</p>
                  </div>
                  <Calendar className="text-green-600" size={48} />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Total Shifts</p>
                    <p className="text-3xl font-bold text-purple-600">{shifts.length}</p>
                  </div>
                  <Clock className="text-purple-600" size={48} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Data Management</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    storage.exportData({
                      employees,
                      roles,
                      shifts,
                      schedule,
                      attendance,
                      shiftHistory,
                      leaveRequests,
                      exportedAt: new Date().toISOString()
                    });
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Export Data (JSON)
                </button>
                
                <label className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer">
                  <Plus size={20} />
                  Import Data (JSON)
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        try {
                          const result = await storage.importData(file);
                          if (result.success) {
                            const loadResult = await storage.loadData();
                            if (loadResult.success) {
                              setEmployees(loadResult.data.employees || []);
                              setRoles(loadResult.data.roles || []);
                              setShifts(loadResult.data.shifts || []);
                              setSchedule(loadResult.data.schedule || {});
                              setAttendance(loadResult.data.attendance || {});
                              setShiftHistory(loadResult.data.shiftHistory || {});
                              setLeaveRequests(loadResult.data.leaveRequests || {});
                              alert('Data imported successfully!');
                            }
                          }
                        } catch (error) {
                          alert('Error importing data: ' + error.message);
                        }
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
                
                <button
                  onClick={async () => {
                    if (window.confirm('This will clear all data. Are you sure?')) {
                      await storage.clearData();
                      setEmployees([]);
                      setRoles([]);
                      setShifts([]);
                      setSchedule({});
                      setAttendance({});
                      setShiftHistory({});
                      setLeaveRequests({});
                      alert('All data cleared!');
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <Trash2 size={20} />
                  Clear All Data
                </button>
                
                <button
                  onClick={async () => {
                    const result = await storage.loadData();
                    if (result.success) {
                      setEmployees(result.data.employees || []);
                      setRoles(result.data.roles || []);
                      setShifts(result.data.shifts || []);
                      setSchedule(result.data.schedule || {});
                      setAttendance(result.data.attendance || {});
                      setShiftHistory(result.data.shiftHistory || {});
                      setLeaveRequests(result.data.leaveRequests || {});
                      alert('Data reloaded from storage!');
                    }
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Clock size={20} />
                  Reload Data
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                <p className="font-medium text-gray-700">Storage Status:</p>
                <p className="text-gray-600">• Employees: {employees.length}</p>
                <p className="text-gray-600">• Roles: {roles.length}</p>
                <p className="text-gray-600">• Shifts: {shifts.length}</p>
                <p className="text-gray-600">• Auto-saves on every change</p>
              </div>
            </div>
          </div>
        )}

        {/* Employees */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Employee Management</h2>
              <button
                onClick={() => setShowEmployeeForm(!showEmployeeForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus size={20} /> Add Employee
              </button>
            </div>

            {showEmployeeForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold mb-4">{editingEmployee ? 'Edit Employee' : 'New Employee'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Name"
                    value={employeeForm.name}
                    onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})}
                    className="border rounded px-3 py-2"
                  />
                  <select
                    value={employeeForm.roleId}
                    onChange={e => setEmployeeForm({...employeeForm, roleId: e.target.value})}
                    className="border rounded px-3 py-2"
                  >
                    <option value="">Select Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Weekly Hours"
                    value={employeeForm.weeklyHours}
                    onChange={e => setEmployeeForm({...employeeForm, weeklyHours: Number(e.target.value)})}
                    className="border rounded px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Daily Max Hours"
                    value={employeeForm.dailyMaxHours}
                    onChange={e => {
                      const dailyMax = Number(e.target.value);
                      const shiftsPerWeek = calculateShiftsPerWeek(employeeForm.weeklyHours, dailyMax);
                      setEmployeeForm({...employeeForm, dailyMaxHours: dailyMax, shiftsPerWeek});
                    }}
                    className="border rounded px-3 py-2"
                  />
                  <div className="col-span-2 bg-blue-50 p-3 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Calculated Shifts Per Week: {calculateShiftsPerWeek(employeeForm.weeklyHours, employeeForm.dailyMaxHours)}</strong>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      This employee will be assigned exactly {calculateShiftsPerWeek(employeeForm.weeklyHours, employeeForm.dailyMaxHours)} shifts per week
                    </p>
                  </div>
                  <input
                    placeholder="Skills (comma separated)"
                    value={employeeForm.skills}
                    onChange={e => setEmployeeForm({...employeeForm, skills: e.target.value})}
                    className="border rounded px-3 py-2 col-span-2"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={saveEmployee}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Save Employee
                  </button>
                  <button
                    onClick={() => {
                      setShowEmployeeForm(false);
                      setEditingEmployee(null);
                      setEmployeeForm({ id: '', name: '', roleId: '', weeklyHours: 40, dailyMaxHours: 8, skills: '', shiftsPerWeek: 5 });
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Role</th>
                    <th className="px-4 py-2 text-left">Weekly Hours</th>
                    <th className="px-4 py-2 text-left">Daily Max</th>
                    <th className="px-4 py-2 text-left">Shifts/Week</th>
                    <th className="px-4 py-2 text-left">Skills</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedEmployees().map(emp => {
                    const role = roles.find(r => r.id === emp.roleId);
                    return (
                      <tr key={emp.id} className="border-b">
                        <td className="px-4 py-2">{emp.name}</td>
                        <td className="px-4 py-2">{role?.name || 'N/A'}</td>
                        <td className="px-4 py-2">{emp.weeklyHours}h</td>
                        <td className="px-4 py-2">{emp.dailyMaxHours}h</td>
                        <td className="px-4 py-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                            {emp.shiftsPerWeek || calculateShiftsPerWeek(emp.weeklyHours, emp.dailyMaxHours)}
                          </span>
                        </td>
                        <td className="px-4 py-2">{emp.skills.join(', ')}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingEmployee(emp);
                                setEmployeeForm({...emp, skills: emp.skills.join(', ')});
                                setShowEmployeeForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => setSelectedEmployeeForLeave(emp)}
                              className="text-purple-600 hover:text-purple-800"
                              title="Manage Leave & Attendance"
                            >
                              <Calendar size={18} />
                            </button>
                            <button
                              onClick={() => deleteEmployee(emp.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Leave & Attendance Management Modal */}
            {selectedEmployeeForLeave && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">
                        {selectedEmployeeForLeave.name} - Leave & Attendance
                      </h3>
                      <button
                        onClick={() => setSelectedEmployeeForLeave(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XCircle size={24} />
                      </button>
                    </div>

                    {/* Leave Management */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-lg mb-3">Leave Management</h4>
                      <div className="grid grid-cols-7 gap-2">
                        {currentWeek.map((date, idx) => {
                          const isLeave = isOnLeave(selectedEmployeeForLeave.id, date);
                          return (
                            <div key={date} className="text-center">
                              <div className="text-sm font-medium mb-1">{daysOfWeek[idx].slice(0, 3)}</div>
                              <div className="text-xs text-gray-600 mb-2">{date}</div>
                              <button
                                onClick={() => {
                                  if (isLeave) {
                                    removeLeaveRequest(selectedEmployeeForLeave.id, date);
                                  } else {
                                    addLeaveRequest(selectedEmployeeForLeave.id, date);
                                  }
                                }}
                                className={`w-full px-2 py-2 rounded text-sm font-medium ${
                                  isLeave
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                              >
                                {isLeave ? 'On Leave' : 'Working'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Attendance Tracking */}
                    <div>
                      <h4 className="font-semibold text-lg mb-3">Attendance Tracking</h4>
                      <div className="space-y-3">
                        {currentWeek.map((date, dayIndex) => {
                          const dayName = daysOfWeek[dayIndex];
                          const empShifts = schedule[date]?.[selectedEmployeeForLeave.id] || [];
                          
                          if (empShifts.length === 0 && !isOnLeave(selectedEmployeeForLeave.id, date)) {
                            return null;
                          }

                          return (
                            <div key={date} className="border rounded-lg p-3">
                              <div className="font-medium mb-2">
                                {dayName} - {date}
                              </div>
                              
                              {isOnLeave(selectedEmployeeForLeave.id, date) ? (
                                <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
                                  On Leave
                                </div>
                              ) : empShifts.length > 0 ? (
                                <div className="space-y-2">
                                  {empShifts.map(shift => {
                                    const key = `${selectedEmployeeForLeave.id}-${date}-${shift.id}`;
                                    const record = attendance[key];
                                    
                                    return (
                                      <div key={shift.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded">
                                        <div className="flex-1">
                                          <div className="font-medium text-sm">{shift.name}</div>
                                          <div className="text-xs text-gray-600">
                                            {shift.startTime} - {shift.endTime}
                                          </div>
                                        </div>
                                        {!record ? (
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="time"
                                              className="border rounded px-2 py-1 text-sm"
                                              value={attendanceTime[key] || ''}
                                              onChange={e => setAttendanceTime({...attendanceTime, [key]: e.target.value})}
                                            />
                                            <button
                                              onClick={() => markAttendance(selectedEmployeeForLeave.id, date, shift.id)}
                                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                            >
                                              Mark
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{record.time}</span>
                                            {record.status === 'on-time' && (
                                              <div className="flex items-center gap-1 text-green-600 text-sm">
                                                <CheckCircle size={16} />
                                                <span>On Time</span>
                                              </div>
                                            )}
                                            {record.status === 'correct' && (
                                              <div className="flex items-center gap-1 text-yellow-600 text-sm">
                                                <AlertCircle size={16} />
                                                <span>Slightly Late</span>
                                              </div>
                                            )}
                                            {record.status === 'late' && (
                                              <div className="flex items-center gap-1 text-red-600 text-sm">
                                                <XCircle size={16} />
                                                <span>Late</span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-gray-500 text-sm">No shifts scheduled</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Roles */}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Roles</h2>
              <button
                onClick={() => setShowRoleForm(!showRoleForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus size={20} /> Add Role
              </button>
            </div>

            {showRoleForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold mb-4">{editingRole ? 'Edit Role' : 'New Role'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Role Name"
                    value={roleForm.name}
                    onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                    className="border rounded px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Break Time (minutes)"
                    value={roleForm.breakMinutes}
                    onChange={e => setRoleForm({...roleForm, breakMinutes: Number(e.target.value)})}
                    className="border rounded px-3 py-2"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={roleForm.weekendRequired}
                      onChange={e => setRoleForm({...roleForm, weekendRequired: e.target.checked})}
                    />
                    Weekend Work Required
                  </label>
                  <input
                    placeholder="Required Skills (comma separated)"
                    value={roleForm.requiredSkills}
                    onChange={e => setRoleForm({...roleForm, requiredSkills: e.target.value})}
                    className="border rounded px-3 py-2 col-span-2"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={saveRole}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Save Role
                  </button>
                  <button
                    onClick={() => {
                      setShowRoleForm(false);
                      setEditingRole(null);
                      setRoleForm({ id: '', name: '', weekendRequired: false, requiredSkills: '', breakMinutes: 60 });
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Role Name</th>
                    <th className="px-4 py-2 text-left">Break Time</th>
                    <th className="px-4 py-2 text-left">Weekend Required</th>
                    <th className="px-4 py-2 text-left">Skills</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(role => (
                    <tr key={role.id} className="border-b">
                      <td className="px-4 py-2">{role.name}</td>
                      <td className="px-4 py-2">{role.breakMinutes} min</td>
                      <td className="px-4 py-2">{role.weekendRequired ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2">{role.requiredSkills.join(', ')}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingRole(role);
                              setRoleForm({...role, requiredSkills: role.requiredSkills.join(', ')});
                              setShowRoleForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => deleteRole(role.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shifts */}
        {activeTab === 'shifts' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Shifts</h2>
              <button
                onClick={() => setShowShiftForm(!showShiftForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus size={20} /> Add Shift
              </button>
            </div>

            {showShiftForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold mb-4">{editingShift ? 'Edit Shift' : 'New Shift'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Shift Name"
                    value={shiftForm.name}
                    onChange={e => setShiftForm({...shiftForm, name: e.target.value})}
                    className="border rounded px-3 py-2"
                  />
                  <select
                    value={shiftForm.roleId}
                    onChange={e => setShiftForm({...shiftForm, roleId: e.target.value})}
                    className="border rounded px-3 py-2"
                  >
                    <option value="">Select Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})}
                    className="border rounded px-3 py-2"
                  />
                  <input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})}
                    className="border rounded px-3 py-2"
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority Weight (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={shiftForm.priority}
                      onChange={e => setShiftForm({...shiftForm, priority: Number(e.target.value)})}
                      className="border rounded px-3 py-2 w-full"
                      placeholder="0-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher = more employees assigned (50 = equal split)</p>
                  </div>
                  <div className="col-span-2">
                    <p className="mb-2 font-medium">Days of Week</p>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map(day => (
                        <label key={day} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={shiftForm.daysOfWeek.includes(day)}
                            onChange={e => {
                              const days = e.target.checked
                                ? [...shiftForm.daysOfWeek, day]
                                : shiftForm.daysOfWeek.filter(d => d !== day);
                              setShiftForm({...shiftForm, daysOfWeek: days});
                            }}
                          />
                          {day.slice(0, 3)}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={saveShift}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Save Shift
                  </button>
                  <button
                    onClick={() => {
                      setShowShiftForm(false);
                      setEditingShift(null);
                      setShiftForm({ id: '', name: '', startTime: '09:00', endTime: '17:00', roleId: '', daysOfWeek: [], priority: 50 });
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Shift Name</th>
                    <th className="px-4 py-2 text-left">Role</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Work Hours</th>
                    <th className="px-4 py-2 text-left">Priority</th>
                    <th className="px-4 py-2 text-left">Days</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(shift => {
                    const role = roles.find(r => r.id === shift.roleId);
                    return (
                      <tr key={shift.id} className="border-b">
                        <td className="px-4 py-2">{shift.name}</td>
                        <td className="px-4 py-2">{role?.name || 'N/A'}</td>
                        <td className="px-4 py-2">{shift.startTime} - {shift.endTime}</td>
                        <td className="px-4 py-2">{shift.hours}h (Break: {role?.breakMinutes || 0}m)</td>
                        <td className="px-4 py-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                            {shift.priority || 1}
                          </span>
                        </td>
                        <td className="px-4 py-2">{shift.daysOfWeek.map(d => d.slice(0, 3)).join(', ')}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingShift(shift);
                                setShiftForm(shift);
                                setShowShiftForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => deleteShift(shift.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Schedule */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Weekly Schedule</h2>
              <button
                onClick={generateSchedule}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
              >
                <Calendar size={20} /> Generate Schedule
              </button>
            </div>

            {Object.keys(schedule).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left sticky left-0 bg-gray-100">Employee</th>
                      {currentWeek.map((date, idx) => (
                        <th key={date} className="border px-4 py-2 text-center min-w-32">
                          <div>{daysOfWeek[idx]}</div>
                          <div className="text-sm text-gray-600">{date}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sortedEmps = getSortedEmployees();
                      let lastRoleId = null;
                      
                      return sortedEmps.map((emp, empIndex) => {
                        const role = roles.find(r => r.id === emp.roleId);
                        const showRoleDivider = lastRoleId !== null && lastRoleId !== emp.roleId;
                        lastRoleId = emp.roleId;
                        
                        return (
                          <React.Fragment key={emp.id}>
                            {showRoleDivider && (
                              <tr>
                                <td colSpan={8} className="border-t-4 border-blue-300"></td>
                              </tr>
                            )}
                            <tr>
                              <td className="border px-4 py-2 sticky left-0 bg-white">
                                <div className="font-medium">{emp.name}</div>
                                <div className="text-xs text-gray-500">{role?.name || 'N/A'}</div>
                              </td>
                              {currentWeek.map(date => {
                                const isLeave = isOnLeave(emp.id, date);
                                return (
                                  <td key={date} className={`border px-2 py-2 ${isLeave ? 'bg-red-50 bg-opacity-40' : ''}`}>
                                    {isLeave ? (
                                      <div className="text-red-500 text-xs font-medium">Unavailable</div>
                                    ) : (
                                      schedule[date]?.[emp.id]?.map(shift => (
                                        <div key={shift.id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1 text-sm">
                                          <div className="font-medium">{shift.name}</div>
                                          <div className="text-xs">{shift.startTime}-{shift.endTime}</div>
                                        </div>
                                      ))
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">Click "Generate Schedule" to create a weekly schedule</p>
            )}
          </div>
        )}

        {/* Attendance */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Mark Attendance</h2>
            
            <div className="space-y-4">
              {currentWeek.map((date, dayIdx) => {
                const daySchedule = schedule[date] || {};
                const hasShifts = Object.keys(daySchedule).length > 0;
                
                if (!hasShifts) return null;
                
                return (
                  <div key={date} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3">
                      {daysOfWeek[dayIdx]} - {date}
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(daySchedule).map(([empId, empShifts]) => {
                        const emp = employees.find(e => e.id === empId);
                                                  return empShifts.map(shift => {
                          const key = `${empId}-${date}-${shift.id}`;
                          const record = attendance[key];
                          
                          return (
                            <div key={key} className="flex items-center gap-4 bg-gray-50 p-3 rounded">
                              <div className="flex-1">
                                <p className="font-medium">{emp?.name}</p>
                                <p className="text-sm text-gray-600">
                                  {shift.name} ({shift.startTime} - {shift.endTime})
                                </p>
                              </div>
                              {!record ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="time"
                                    className="border rounded px-2 py-1"
                                    value={attendanceTime[key] || ''}
                                    onChange={e => setAttendanceTime({...attendanceTime, [key]: e.target.value})}
                                  />
                                  <button
                                    onClick={() => markAttendance(empId, date, shift.id)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                  >
                                    Mark
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{record.time}</span>
                                  {record.status === 'on-time' && (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <CheckCircle size={20} />
                                      <span>On Time</span>
                                    </div>
                                  )}
                                  {record.status === 'correct' && (
                                    <div className="flex items-center gap-1 text-yellow-600">
                                      <AlertCircle size={20} />
                                      <span>Slightly Late</span>
                                    </div>
                                  )}
                                  {record.status === 'late' && (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <XCircle size={20} />
                                      <span>Late</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {Object.keys(schedule).length === 0 && (
              <p className="text-gray-600 text-center py-8">Generate a schedule first to mark attendance</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftAttendanceApp;