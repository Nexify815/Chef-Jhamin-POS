import * as XLSX from 'xlsx';
import api from '../api';

export async function exportFullWorkbook(role) {
  const [salesAll, expenses, staffLogs, ingredients, menu, extras, recipes, settings] = await Promise.all([
    api.get('sales?includeDeleted=1'),
    api.get('expenses'),
    api.get('staff'),
    api.get('ingredients'),
    api.get('menu'),
    api.get('extras'),
    api.get('recipes'),
    api.get('settings'),
  ]);

  let usersOwner = [];
  if (role === 'owner') {
    usersOwner = await api.get('users') || [];
  }

  const sales = (salesAll || []).filter(s => s.deleted !== 1);
  const deletedSales = (salesAll || []).filter(s => s.deleted === 1);

  const wb = XLSX.utils.book_new();

  // Settings sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
    BusinessName: settings?.businessName || '',
    WeeklyTarget: settings?.weeklyTarget || '',
    DailyTarget: settings?.dailyTarget || '',
    ExpenseLimit: settings?.expenseLimit || ''
  }]), 'Settings');

  // Items (Menu) sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((menu || []).flatMap(m => {
    const sizes = m.sizes || {};
    return Object.keys(sizes).map(sz => ({ Item: m.name, Category: m.category, Size: sz, 'Unit Price': sizes[sz] }));
  })), 'Items');

  // Extras sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((extras || []).map(e => ({
    Name: e.name, Price: e.price
  }))), 'Extras');

  // Ingredients sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((ingredients || []).map(i => ({
    Item: i.name, Unit: i.unit, Stock: i.stock, 'Reorder Level': i.reorder_level,
    Status: Number(i.stock) <= Number(i.reorder_level) ? 'LOW' : 'OK'
  }))), 'Ingredients');

  // Recipes sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((recipes || []).map(r => ({
    MenuItem: r.item_name, Size: r.size, Ingredient: r.ingredient_name,
    QuantityNeeded: r.quantity_needed, Unit: r.unit
  }))), 'Recipes');

  // Users sheet (owner only)
  if (Array.isArray(usersOwner) && usersOwner.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersOwner.map(u => ({
      FullName: u.fullname, Username: u.username, Role: u.role
    }))), 'Users');
  }

  // Sales sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sales.map(s => ({
    Date: s.date, Time: s.timestamp, Staff: s.staff, Item: s.item, Size: s.size,
    Qty: s.qty, 'Unit Price': s.unitPrice, Extras: s.extraItem || '',
    'Extra Cost': s.extraCost || 0, Total: s.total, Payment: s.payment
  }))), 'Sales');

  // Deleted Sales sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deletedSales.map(s => ({
    Date: s.date, Time: s.timestamp, Staff: s.staff, Item: s.item, Size: s.size,
    Qty: s.qty, Total: s.total, Payment: s.payment,
    DeletedBy: s.deleted_by || '', DeletedAt: s.deleted_at || ''
  }))), 'Deleted Sales');

  // Expenses sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((expenses || []).map(e => ({
    Date: e.date, Category: e.category, Description: e.description,
    Amount: e.amount, Payment: e.payment
  }))), 'Expenses');

  // Staff Log sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((staffLogs || []).map(s => ({
    Date: s.date, Name: s.name, Shift: s.shift, Task: s.task,
    'Time In': s.timeIn, 'Time Out': s.timeOut, Hours: s.hours, Status: s.status
  }))), 'Staff Log');

  // Inventory sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((ingredients || []).map(i => ({
    Item: i.name, Unit: i.unit, Stock: i.stock, 'Reorder Level': i.reorder_level,
    Status: Number(i.stock) <= Number(i.reorder_level) ? 'LOW' : 'OK'
  }))), 'Inventory');

  XLSX.writeFile(wb, `Kitchen_System_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  return true;
}
