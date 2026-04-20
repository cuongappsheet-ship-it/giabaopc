import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingCart, 
  Truck, 
  Box, 
  PieChart, 
  Users, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  RotateCcw,
  BarChart3,
  Calendar,
  Wallet,
  ArrowUpRight,
  ChevronRight,
  Check,
  Wrench
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatNumber } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { invoices, returnSalesOrders, cashTransactions } = useAppContext();
  const [showProfit, setShowProfit] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'last_month' | 'this_year'>('this_month');

  const parseDate = (dateStr: any) => {
    if (!dateStr) return new Date(0);
    
    const str = String(dateStr);
    // Clean up the string: split by space, comma, or 'T'
    const tokens = str.split(/[\s,T]+/);
    // Find the token that looks like a date (contains / or -), fallback to first token
    const datePart = tokens.find(t => t.includes('/') || t.includes('-')) || tokens[0];
    
    let d: Date;
    // Handle DD/MM/YYYY
    if (datePart.includes('/')) {
      const parts = datePart.split('/');
      if (parts.length === 3) {
        // If first part is 4 digits, it's YYYY/MM/DD
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          // Otherwise assume DD/MM/YYYY
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      } else {
        d = new Date(str);
      }
    } else if (datePart.includes('-')) {
      // Handle YYYY-MM-DD
      const parts = datePart.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          // Assume DD-MM-YYYY
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      } else {
        d = new Date(str);
      }
    } else {
      // Check if it's a numeric timestamp
      if (!isNaN(Number(str))) {
        d = new Date(Number(str));
      } else {
        d = new Date(str);
      }
    }

    // Return a date object set to midnight for accurate comparison
    if (isNaN(d.getTime())) return new Date(0);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const getRangeLabel = () => {
    const today = new Date();
    const formatDate = (date: Date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    switch (dateRange) {
      case 'today': 
        return `Hôm nay, ${formatDate(today)}`;
      case 'yesterday': 
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return `Hôm qua, ${formatDate(yesterday)}`;
      case 'last_7_days': 
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        return `7 ngày qua (${formatDate(sevenDaysAgo)} - ${formatDate(today)})`;
      case 'this_month': 
        return `Tháng này, T${today.getMonth() + 1}/${today.getFullYear()}`;
      case 'last_month': 
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return `Tháng trước, T${lastMonth.getMonth() + 1}/${lastMonth.getFullYear()}`;
      case 'this_year': 
        return `Năm nay, ${today.getFullYear()}`;
      default: return 'Chọn thời gian';
    }
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const filterByRange = (items: any[]) => {
      return items.filter(item => {
        const itemDate = parseDate(item.date);
        const itemTime = itemDate.getTime();
        
        if (dateRange === 'today') {
          return itemTime === startOfToday.getTime();
        }
        if (dateRange === 'yesterday') {
          const yesterday = new Date(startOfToday);
          yesterday.setDate(yesterday.getDate() - 1);
          return itemTime === yesterday.getTime();
        }
        if (dateRange === 'last_7_days') {
          const sevenDaysAgo = new Date(startOfToday);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 days including today
          return itemTime >= sevenDaysAgo.getTime() && itemTime <= startOfToday.getTime();
        }
        if (dateRange === 'this_month') {
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
        if (dateRange === 'last_month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
        }
        if (dateRange === 'this_year') {
          return itemDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    };

    return {
      invoices: filterByRange(invoices),
      returns: filterByRange(returnSalesOrders),
      cashTransactions: filterByRange(cashTransactions)
    };
  }, [invoices, returnSalesOrders, cashTransactions, dateRange]);

  const topProductsYearly = useMemo(() => {
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    const now = new Date();
    
    invoices.forEach(inv => {
      if (!inv.date) return;
      const invDate = parseDate(inv.date);
      // Filter for this year only
      if (invDate.getFullYear() !== now.getFullYear()) return;
      
      if (!inv.items) return;
      inv.items.forEach((item: any) => {
        if (!item.id || !item.name) return;
        if (!productSalesMap[item.id]) {
          productSalesMap[item.id] = { name: item.name, qty: 0, revenue: 0 };
        }
        productSalesMap[item.id].qty += item.qty || 0;
        productSalesMap[item.id].revenue += (item.qty * item.price) || 0;
      });
    });

    return Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [invoices]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalOrders = filteredData.invoices.length;
    
    const totalCost = filteredData.invoices.reduce((sum, inv) => {
      const items = inv.items || [];
      return sum + items.reduce((iSum: number, item: any) => iSum + (item.importPriceTotal || 0), 0);
    }, 0);
    const totalProfit = totalRevenue - totalCost;

    const totalReturns = filteredData.returns.reduce((sum, ret) => sum + (ret.total || 0), 0);
    const returnCount = filteredData.returns.length;

    const totalCashIn = filteredData.cashTransactions
      .filter(tx => tx.type === 'RECEIPT')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const totalCashOut = filteredData.cashTransactions
      .filter(tx => tx.type === 'PAYMENT')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return {
      totalRevenue,
      totalOrders,
      totalProfit,
      totalReturns,
      returnCount,
      totalCashIn,
      totalCashOut
    };
  }, [filteredData]);

  // Chart data - group by day (always show last 7 days for visual context, or adjust to range)
  const chartData = useMemo(() => {
    if (dateRange === 'this_year') {
      const months = [...Array(12)].map((_, i) => `T${i + 1}`);
      const dataMap: Record<string, number> = {};
      months.forEach(m => dataMap[m] = 0);

      filteredData.invoices.forEach(inv => {
        if (!inv.date) return;
        const itemDate = parseDate(inv.date);
        const monthStr = `T${itemDate.getMonth() + 1}`;
        if (dataMap[monthStr] !== undefined) {
          dataMap[monthStr] += (inv.total || 0);
        }
      });

      return months.map(m => ({
        name: m,
        revenue: dataMap[m]
      }));
    }

    const daysToShow = dateRange === 'this_month' || dateRange === 'last_month' ? 30 : 7;
    const lastDays = [...Array(daysToShow)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (daysToShow - 1 - i));
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    });

    const dataMap: Record<string, number> = {};
    lastDays.forEach(day => dataMap[day] = 0);

    filteredData.invoices.forEach(inv => {
      if (!inv.date) return;
      const itemDate = parseDate(inv.date);
      const dayMonth = itemDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      if (dataMap[dayMonth] !== undefined) {
        dataMap[dayMonth] += (inv.total || 0);
      }
    });

    return lastDays.map(day => ({
      name: day,
      revenue: dataMap[day]
    }));
  }, [filteredData, dateRange]);

  const formatKilo = (val: number) => {
    return formatNumber(val);
  };

  return (
    <div className="bg-slate-50 md:bg-transparent px-0 md:px-0 py-0 md:py-0">
      {/* Desktop View */}
      <div className="hidden md:block p-6">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-8 rounded-xl text-white shadow-lg relative overflow-hidden group border border-blue-500/20">
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-blue-100 text-xs font-medium opacity-90">Kỳ xem</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as any)}
                        className="bg-white/20 text-white border-none rounded-md text-sm font-bold pl-2 pr-8 py-1 focus:ring-0 outline-none appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%></path>%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                      >
                        <option value="today" className="text-slate-800">Hôm nay</option>
                        <option value="yesterday" className="text-slate-800">Hôm qua</option>
                        <option value="last_7_days" className="text-slate-800">7 ngày qua</option>
                        <option value="this_month" className="text-slate-800">Tháng này</option>
                        <option value="last_month" className="text-slate-800">Tháng trước</option>
                        <option value="this_year" className="text-slate-800">Năm nay</option>
                      </select>
                      <span className="text-blue-200 text-xs font-medium">({getRangeLabel().split(', ')[1] || getRangeLabel()})</span>
                    </div>
                  </div>
                  <p className="text-blue-100 text-[11px] font-normal tracking-widest mb-2 opacity-90">Doanh thu hệ thống</p>
                  <h2 className="text-4xl md:text-5xl font-medium mb-10 tracking-tight drop-shadow-md">{formatNumber(stats.totalRevenue)}đ</h2>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 text-[11px] font-normal tracking-widest mb-2 opacity-90">Lợi nhuận</p>
                  <h2 className="text-3xl md:text-4xl font-medium mb-10 tracking-tight drop-shadow-md text-emerald-300">{formatNumber(stats.totalProfit)}đ</h2>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-lg border border-white/20 shadow-xl flex-1">
                  <p className="text-[10px] font-normal opacity-70 mb-1 tracking-widest">Đơn bán</p>
                  <p className="font-medium text-3xl tracking-tight">{stats.totalOrders}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-lg border border-white/20 shadow-xl flex-1">
                  <p className="text-[10px] font-normal opacity-70 mb-1 tracking-widest text-emerald-200">Tiền vào</p>
                  <p className="font-medium text-3xl tracking-tight text-emerald-300">+{formatNumber(stats.totalCashIn)}đ</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-lg border border-white/20 shadow-xl flex-1">
                  <p className="text-[10px] font-normal opacity-70 mb-1 tracking-widest text-rose-200">Tiền ra</p>
                  <p className="font-medium text-3xl tracking-tight text-rose-300">-{formatNumber(stats.totalCashOut)}đ</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-rows-3 gap-4">
            <Link to="/pos" className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-5 hover:border-blue-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center group-hover:rotate-3 transition-transform shadow-sm border border-orange-100 shrink-0">
                <ShoppingCart size={24} />
              </div>
              <div className="text-left w-full overflow-hidden">
                <p className="font-bold text-slate-800 text-sm tracking-tight truncate">Bán hàng</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">Tạo hóa đơn POS nhanh</p>
              </div>
            </Link>
            <Link to="/import" className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-5 hover:border-indigo-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center group-hover:rotate-3 transition-transform shadow-sm border border-indigo-100 shrink-0">
                <Truck size={24} />
              </div>
              <div className="text-left w-full overflow-hidden">
                <p className="font-bold text-slate-800 text-sm tracking-tight truncate">Nhập hàng</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">Tạo phiếu nhập kho</p>
              </div>
            </Link>
            <Link to="/reports" className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-5 hover:border-emerald-400 hover:shadow-md transition-all active:scale-95 group shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:rotate-3 transition-transform shadow-sm border border-emerald-100 shrink-0">
                <PieChart size={24} />
              </div>
              <div className="text-left w-full overflow-hidden">
                <p className="font-bold text-slate-800 text-sm tracking-tight truncate">Báo cáo</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">Xem chi tiết thống kê bán hàng</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Desktop Top Products and Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Desktop Revenue Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-500" /> Thống kê doanh thu
              </h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}Tr` : value}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatNumber(value) + 'đ', 'Doanh thu']}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#2563eb' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Desktop Top Products */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500" /> Sản phẩm bán chạy nhất <span className="text-xs font-normal text-slate-400 ml-1">(trong năm nay)</span>
              </h3>
            </div>
            {topProductsYearly.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {topProductsYearly.slice(0, 4).map((p, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">#{i + 1}</span>
                        <p className="text-xs font-bold text-slate-600 text-right">{p.qty} sl</p>
                      </div>
                      <p className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug">{p.name}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-400 mb-0.5">Doanh thu:</p>
                      <p className="font-bold text-blue-600 tracking-tight">{formatNumber(p.revenue)}đ</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 italic text-sm">Chưa có dữ liệu bán hàng.</div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col gap-3 p-3 pb-24">
        {/* Simplified Date Selector */}
        <div className="flex items-center justify-between mb-1 pb-1">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight shrink-0">Tổng quan</h2>
          <div className="relative max-w-[65%]">
            <div className="bg-blue-50 text-blue-600 rounded-lg text-[13px] font-bold px-3 py-2 flex items-center justify-end gap-1 shadow-sm border border-blue-100">
              <span className="truncate">{getRangeLabel()}</span>
              <ChevronDown size={14} className="shrink-0" />
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-right appearance-none"
            >
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="last_7_days">7 ngày qua</option>
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="this_year">Năm nay</option>
            </select>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-[11px] font-normal tracking-wider mb-1 truncate">Doanh thu ({stats.totalOrders} đơn)</p>
              <div className="flex items-baseline gap-1 overflow-hidden">
                <span className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight truncate">{formatKilo(stats.totalRevenue)}</span>
                <span className="text-[10px] font-medium text-slate-500 shrink-0">đ</span>
              </div>
            </div>
            <div className="text-right shrink-0 max-w-[50%]">
              <div className="flex items-center justify-end gap-2 mb-1">
                <p className="text-slate-400 text-[11px] font-normal tracking-wider">Lợi nhuận</p>
                <button onClick={() => setShowProfit(!showProfit)} className="text-slate-400 shrink-0">
                  {showProfit ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex items-baseline justify-end gap-1 overflow-hidden">
                {showProfit ? (
                  <>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-500 tracking-tight truncate">{formatKilo(stats.totalProfit)}</span>
                    <span className="text-[10px] font-medium text-slate-500 shrink-0">đ</span>
                  </>
                ) : (
                  <span className="text-xl sm:text-2xl font-bold text-emerald-500 tracking-widest shrink-0">*** ***</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <div className="min-w-0">
              <p className="text-slate-400 text-[11px] font-normal tracking-wider mb-1 truncate">Tiền vào</p>
              <div className="flex items-baseline gap-1 overflow-hidden">
                <span className="text-lg sm:text-xl font-bold text-emerald-600 tracking-tight truncate">+{formatKilo(stats.totalCashIn)}</span>
                <span className="text-[10px] font-medium text-slate-500 shrink-0">đ</span>
              </div>
            </div>
            <div className="text-right min-w-0">
              <p className="text-slate-400 text-[11px] font-normal tracking-wider mb-1 truncate">Tiền ra</p>
              <div className="flex items-baseline justify-end gap-1 overflow-hidden">
                <span className="text-lg sm:text-xl font-bold text-rose-600 tracking-tight truncate">-{formatKilo(stats.totalCashOut)}</span>
                <span className="text-[10px] font-medium text-slate-500 shrink-0">đ</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-slate-500 overflow-hidden">
            <RotateCcw size={16} className="text-orange-400 shrink-0" />
            <span className="text-xs font-normal truncate">{stats.returnCount} đơn trả hàng - </span>
            <span className="text-sm font-medium text-slate-800 tracking-tight truncate">{formatKilo(stats.totalReturns)} đ</span>
          </div>
        </div>

        {/* Quick Menu */}
        <div className="grid grid-cols-5 gap-2 py-2">
          <Link to="/import" className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md shadow-blue-100">
              <Truck size={22} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Nhập<br />hàng hóa</span>
          </Link>
          <Link to="/return-import" className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center text-white shadow-md shadow-orange-100">
              <RotateCcw size={22} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Hoàn hàng<br />nhập</span>
          </Link>
          <Link to="/maintenance" className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-violet-400 rounded-full flex items-center justify-center text-white shadow-md shadow-violet-100">
              <Wrench size={22} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight">Bảo hành<br />sửa chữa</span>
          </Link>
          <Link to="/cash-ledger" className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-emerald-400 rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-100">
              <Wallet size={22} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight px-1">Sổ quỹ</span>
          </Link>
          <Link to="/users" className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-indigo-400 rounded-full flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Users size={22} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center leading-tight px-1">Nhân viên</span>
          </Link>
        </div>

        {/* Top Selling Products - Mobile */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" /> Sản phẩm bán chạy <span className="text-[10px] font-normal text-slate-400 mt-0.5">(trong năm nay)</span>
            </h3>
          </div>
          
          {topProductsYearly.length > 0 ? (
            <div className="flex flex-col gap-3">
              {topProductsYearly.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-blue-600">{formatNumber(p.revenue)}đ</span>
                      <span className="text-[10px] text-slate-400 font-medium">({p.qty} sl)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-6 text-slate-400 italic text-sm">Chưa có dữ liệu bán hàng.</div>
          )}
        </div>

        {/* Revenue Chart Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight">Doanh thu</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-blue-50 p-1.5 rounded-lg">
                <BarChart3 size={18} className="text-blue-600" />
              </div>
              <ArrowUpRight size={20} className="text-slate-300" />
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}Tr` : value}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatNumber(value) + 'đ', 'Doanh thu']}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#2563eb' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
