import React, { useState } from 'react';
import { Search, UserPlus, User, X, FileText, Calendar, Wallet, ChevronRight, CreditCard, Hash, Printer, Settings, HelpCircle, List, MoreHorizontal, Send, Download, SlidersHorizontal, Plus, Edit3, ChevronLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Invoice, CashTransaction } from '../types';
import { formatNumber, parseFormattedNumber } from '../lib/utils';
import { generateId } from '../lib/idUtils';
import { PrintTemplate } from '../components/PrintTemplate';
import { useScrollLock } from '../hooks/useScrollLock';

export const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, invoices, updateInvoice, addCashTransaction, returnSalesOrders, currentUser, cashTransactions } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Reset page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Print State
  const [printData, setPrintData] = useState<any>(null);

  const handlePrint = (data: any) => {
    setPrintData(data);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'ALL' | 'SINGLE'>('ALL');
  const [targetInvoiceId, setTargetInvoiceId] = useState<string | null>(null);

  // Lock scroll when modals are open
  useScrollLock(isModalOpen || !!selectedCustomer || !!selectedInvoice || isPaymentModalOpen);

  const filteredCustomers = (customers || []).filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone || '').includes(searchTerm) ||
    (c.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  const handleSave = () => {
    if (!name || !phone) {
      alert("Vui lòng nhập đủ tên và số điện thoại");
      return;
    }
    
    const customerData = { 
      name, 
      phone, 
      address, 
      location, 
      note,
      createdBy: editingCustomerId ? undefined : (currentUser?.name || 'Admin'),
      createdAt: editingCustomerId ? undefined : new Date().toLocaleString('vi-VN')
    };

    if (editingCustomerId) {
      updateCustomer(editingCustomerId, customerData);
    } else {
      addCustomer(customerData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setLocation('');
    setNote('');
    setEditingCustomerId(null);
  };

  const handleEdit = (customer: Customer) => {
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address || '');
    setLocation(customer.location || '');
    setNote(customer.note || '');
    setEditingCustomerId(customer.id || null);
    setIsModalOpen(true);
  };

  const getCustomerStats = (customer: Customer) => {
    const customerInvoices = invoices.filter(inv => 
      (inv.phone && inv.phone !== '---' && inv.phone === customer.phone) || 
      (inv.customer === customer.name)
    );
    
    const customerReturns = returnSalesOrders.filter(ret => 
      ret.customer === customer.name
    );

    const totalSpent = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalReturned = customerReturns.reduce((sum, ret) => sum + ret.total, 0);
    const totalDebt = customerInvoices.reduce((sum, inv) => sum + (inv.debt || 0), 0);
    const totalPaid = customerInvoices.reduce((sum, inv) => sum + (inv.paid || 0), 0);
    const avgPerOrder = customerInvoices.length > 0 ? totalSpent / customerInvoices.length : 0;
    const paymentRate = totalSpent > 0 ? (totalPaid / totalSpent) * 100 : 0;
    
    const sortedInvoices = [...customerInvoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastInvoiceDate = sortedInvoices[0]?.date;
    const lastReturnDate = [...customerReturns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
    
    let lastTransaction = lastInvoiceDate;
    if (lastReturnDate && (!lastTransaction || new Date(lastReturnDate) > new Date(lastTransaction))) {
      lastTransaction = lastReturnDate;
    }

    const unpaidInvoices = customerInvoices.filter(inv => inv.debt > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let debtDays = 0;
    if (unpaidInvoices.length > 0) {
      const oldestUnpaidDate = new Date(unpaidInvoices[0].date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - oldestUnpaidDate.getTime());
      debtDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      count: customerInvoices.length,
      total: totalSpent,
      netTotal: totalSpent - totalReturned,
      debt: totalDebt,
      avgPerOrder,
      paymentRate,
      debtDays,
      lastTransaction,
      invoices: sortedInvoices
    };
  };

  const handleOpenPaymentModal = (type: 'ALL' | 'SINGLE', invoiceId: string | null = null, defaultAmount: number = 0) => {
    setPaymentType(type);
    setTargetInvoiceId(invoiceId);
    setPaymentAmount(formatNumber(defaultAmount));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  const executePayment = () => {
    const payValue = parseFormattedNumber(paymentAmount);
    if (isNaN(payValue) || payValue <= 0) return alert('Số tiền không hợp lệ');

    const transactionId = generateId('PT', cashTransactions);
    const newTransaction: CashTransaction = {
      id: transactionId,
      date: `${paymentDate} ${new Date().toLocaleTimeString()}`,
      type: 'RECEIPT',
      amount: payValue,
      category: 'DEBT_COLLECTION',
      partner: selectedCustomer?.name || '',
      note: paymentType === 'SINGLE' ? `Thu nợ hóa đơn ${targetInvoiceId}` : `Thu nợ tổng KH ${selectedCustomer?.name}`,
      refId: targetInvoiceId || undefined
    };

    if (paymentType === 'SINGLE' && targetInvoiceId) {
      const invoice = invoices.find(inv => inv.id === targetInvoiceId);
      if (!invoice) return;
      if (payValue > invoice.debt) return alert('Số tiền thanh toán không được lớn hơn số nợ của hóa đơn');

      updateInvoice(invoice.id, {
        paid: invoice.paid + payValue,
        debt: invoice.debt - payValue
      });
    } else if (paymentType === 'ALL' && selectedCustomer) {
      const stats = getCustomerStats(selectedCustomer);
      if (payValue > stats.debt) return alert('Số tiền thanh toán không được lớn hơn tổng nợ');

      let remainingPayment = payValue;
      // FIFO: Sort by date ascending (oldest first)
      const invoicesWithDebt = [...stats.invoices]
        .filter(inv => inv.debt > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      invoicesWithDebt.forEach(invoice => {
        if (remainingPayment <= 0) return;
        const paymentForThisInvoice = Math.min(invoice.debt, remainingPayment);
        updateInvoice(invoice.id, {
          paid: invoice.paid + paymentForThisInvoice,
          debt: invoice.debt - paymentForThisInvoice
        });
        remainingPayment -= paymentForThisInvoice;
      });
    }

    addCashTransaction(newTransaction);
    setIsPaymentModalOpen(false);
    
    if (confirm('Thu nợ thành công! Bạn có muốn in phiếu thu không?')) {
      handlePrint({
        title: 'PHIẾU THU TIỀN',
        id: transactionId,
        date: newTransaction.date,
        partner: newTransaction.partner,
        total: newTransaction.amount,
        paid: newTransaction.amount,
        debt: 0,
        note: newTransaction.note,
        type: 'THU'
      });
    }
  };

  return (
    <div className="flex flex-col px-4 md:px-0 py-4 md:py-0">
      {/* Print Template Container */}
      {printData && <PrintTemplate {...printData} />}

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4 shrink-0 justify-between">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm w-full md:w-[300px] focus-within:border-blue-400 transition-all">
          <Search className="text-slate-400" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Theo mã, tên, số điện thoại" 
            className="flex-1 bg-transparent text-sm font-medium outline-none"
          />
          <SlidersHorizontal className="text-slate-400 cursor-pointer" size={16} />
        </div>
        
        <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex"
          >
            <Plus size={16} /> Khách hàng
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white md:border border-slate-200 md:rounded-xl md:shadow-sm">
        {/* Desktop Table */}
        <table className="w-full text-left border-collapse min-w-[1000px] hidden md:table">
          <thead className="bg-[#f0f4f8] sticky top-0 z-10">
            <tr>
              <th className="p-3 w-12 text-center border-b border-slate-200">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
              </th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200">Mã khách hàng</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200">Tên khách hàng</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200">Điện thoại</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200">Địa chỉ</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200">Khu vực</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200 text-right">Nợ hiện tại</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200 text-right">Số ngày nợ</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200 text-right">Tổng bán</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200 text-right">Tổng bán trừ trả hàng</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200">Giao dịch cuối</th>
              <th className="p-3 text-sm font-bold text-slate-700 border-b border-slate-200 text-center">Thao tác</th>
            </tr>
            <tr className="bg-white">
              <td className="p-3 border-b border-slate-200"></td>
              <td className="p-3 border-b border-slate-200"></td>
              <td className="p-3 border-b border-slate-200"></td>
              <td className="p-3 border-b border-slate-200"></td>
              <td className="p-3 border-b border-slate-200"></td>
              <td className="p-3 border-b border-slate-200"></td>
              <td className="p-3 text-sm font-bold text-slate-800 border-b border-slate-200 text-right">
                {formatNumber(filteredCustomers.reduce((sum, c) => sum + getCustomerStats(c).debt, 0))}
              </td>
              <td className="p-3 border-b border-slate-200"></td>
              <td className="p-3 text-sm font-bold text-slate-800 border-b border-slate-200 text-right">
                {formatNumber(filteredCustomers.reduce((sum, c) => sum + getCustomerStats(c).total, 0))}
              </td>
              <td className="p-3 text-sm font-bold text-slate-800 border-b border-slate-200 text-right">
                {formatNumber(filteredCustomers.reduce((sum, c) => sum + getCustomerStats(c).netTotal, 0))}
              </td>
              <td className="p-3 border-b border-slate-200"></td>
              <td className="p-3 border-b border-slate-200"></td>
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-10 text-center text-slate-400 italic text-sm">Chưa có khách hàng.</td>
              </tr>
            ) : (
              paginatedCustomers.map((c, idx) => {
                const stats = getCustomerStats(c);
                return (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedCustomer(c)}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                    </td>
                    <td className="p-3 text-sm text-slate-600 border-b border-slate-100">{c.id}</td>
                    <td className="p-3 text-sm text-slate-800 border-b border-slate-100">{c.name}</td>
                    <td className="p-3 text-sm text-slate-600 border-b border-slate-100">{c.phone}</td>
                    <td className="p-3 text-sm text-slate-600 border-b border-slate-100">{c.address || '---'}</td>
                    <td className="p-3 text-sm text-slate-600 border-b border-slate-100">{c.location || '---'}</td>
                    <td className="p-3 text-sm font-bold text-red-600 border-b border-slate-100 text-right">{formatNumber(stats.debt)}</td>
                    <td className="p-3 text-sm text-slate-600 border-b border-slate-100 text-right">{stats.debtDays > 0 ? `${stats.debtDays} ngày` : '---'}</td>
                    <td className="p-3 text-sm text-slate-600 border-b border-slate-100 text-right">{formatNumber(stats.total)}</td>
                    <td className="p-3 text-sm text-slate-600 border-b border-slate-100 text-right">{formatNumber(stats.netTotal)}</td>
                    <td className="p-3 text-sm text-slate-600 border-b border-slate-100">{stats.lastTransaction || '---'}</td>
                    <td className="p-3 text-center border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleEdit(c)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedCustomers.length === 0 ? (
            <div className="p-10 text-center text-slate-400 italic text-sm">Chưa có khách hàng.</div>
          ) : (
            paginatedCustomers.map((c, idx) => {
              const stats = getCustomerStats(c);
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedCustomer(c)}
                  className="p-4 active:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-900">{c.name}</h4>
                    <span className={`text-sm font-bold ${stats.debt > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {formatNumber(stats.debt)}đ
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-slate-500 font-medium">{c.phone}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{c.location || 'Chưa định vị'}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                      className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination UI */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-t-0 border-slate-200 rounded-b-sm shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Hiển thị</span>
          <select 
            value={rowsPerPage} 
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white cursor-pointer hover:bg-slate-50"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>dòng / trang</span>
          <span className="ml-4 border-l border-slate-300 pl-4 hidden md:inline">
            Hiển thị {totalItems === 0 ? 0 : startIndex + 1} - {endIndex} trên tổng số {totalItems} khách hàng
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm px-3 font-medium">Trang {currentPage} / {totalPages || 1}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4 p-0 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-slate-50 w-full max-w-4xl h-full md:h-[90vh] md:rounded-xl rounded-none shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tighter">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500 font-bold tracking-widest">{selectedCustomer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getCustomerStats(selectedCustomer).debt > 0 && (
                  <button 
                    onClick={() => handleOpenPaymentModal('ALL', null, getCustomerStats(selectedCustomer).debt)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-100"
                  >
                    <CreditCard size={14} /> Thu nợ khách
                  </button>
                )}
                <button onClick={() => setSelectedCustomer(null)} className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Stats Cards */}
              {(() => {
                const stats = getCustomerStats(selectedCustomer);
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
                      <div className="bg-[#f0f7ff] p-2.5 rounded-lg flex flex-col justify-between h-[72px]">
                        <span className="text-[10px] font-bold text-blue-600">Tổng đơn</span>
                        <p className="text-lg font-bold text-blue-700 leading-none">{stats.count}</p>
                      </div>
                      
                      <div className="bg-[#f0fff4] p-2.5 rounded-lg flex flex-col justify-between h-[72px]">
                        <span className="text-[10px] font-bold text-emerald-600">Tổng mua</span>
                        <p className="text-lg font-bold text-emerald-700 leading-none">
                          {formatNumber(stats.total)} <span className="text-[10px]">đ</span>
                        </p>
                      </div>

                      <div className="bg-[#fff5f5] p-2.5 rounded-lg flex flex-col justify-between h-[72px]">
                        <span className="text-[10px] font-bold text-red-500">Công nợ</span>
                        <p className="text-lg font-bold text-red-600 leading-none">
                          {formatNumber(stats.debt)} <span className="text-[10px]">đ</span>
                        </p>
                      </div>

                      <div className="bg-[#fffaf0] p-2.5 rounded-lg flex flex-col justify-between h-[72px]">
                        <span className="text-[10px] font-bold text-orange-600">Đơn gần nhất</span>
                        <p className="text-lg font-bold text-orange-700 leading-none">
                          {stats.lastTransaction ? (stats.lastTransaction.split(' ').find(p => p.includes('/')) || stats.lastTransaction.split(' ')[0]) : '---'}
                        </p>
                      </div>

                      <div className="bg-[#f0fbfa] p-2.5 rounded-lg flex flex-col justify-between h-[72px] sm:col-span-1 col-span-2 sm:flex hidden">
                        <span className="text-[10px] font-bold text-teal-600">Tỷ lệ TT</span>
                        <p className="text-lg font-bold text-teal-700 leading-none">
                          {Math.round(stats.paymentRate)}%
                        </p>
                      </div>

                      {/* Mobile Payment Rate */}
                      <div className="bg-[#f0fbfa] p-2.5 rounded-lg flex flex-col justify-between h-[72px] sm:hidden flex">
                        <span className="text-[10px] font-bold text-teal-600">Tỷ lệ TT</span>
                        <p className="text-lg font-bold text-teal-700 leading-none">
                          {Math.round(stats.paymentRate)}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-8 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-4">Thông tin cơ bản</h4>
                        <div className="space-y-2 md:space-y-3">
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-500 font-bold">Địa chỉ:</span>
                            <span className="text-xs text-slate-800 font-black">{selectedCustomer.address || '---'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-500 font-bold">Khu vực:</span>
                            <span className="text-xs text-slate-800 font-black">{selectedCustomer.location || '---'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-500 font-bold">Ghi chú:</span>
                            <span className="text-xs text-slate-800 font-black">{selectedCustomer.note || '---'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 md:pt-0 border-t border-slate-100 md:border-t-0">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-4">Thông tin hệ thống</h4>
                        <div className="space-y-2 md:space-y-3">
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-500 font-bold">Người tạo:</span>
                            <span className="text-xs text-slate-800 font-black">{selectedCustomer.createdBy || '---'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-500 font-bold">Ngày tạo:</span>
                            <span className="text-xs text-slate-800 font-black">{selectedCustomer.createdAt || '---'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-500 font-bold">Giao dịch cuối:</span>
                            <span className="text-xs text-slate-800 font-black">{stats.lastTransaction || '---'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Lịch sử mua hàng</h4>
                    <div className="space-y-3">
                      {stats.invoices.length === 0 ? (
                        <p className="text-center py-10 text-slate-400 italic text-sm">Chưa có giao dịch.</p>
                      ) : (
                        stats.invoices.map(invoice => (
                          <div 
                            key={invoice.id} 
                            className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:border-pink-300 transition-all cursor-pointer group/inv"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover/inv:bg-pink-50 group-hover/inv:text-pink-500 transition-all shrink-0">
                                  <FileText size={18} className="md:w-5 md:h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-xs md:text-sm text-slate-800 tracking-tight truncate">{invoice.id}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5 whitespace-nowrap">
                                    <Calendar size={10} className="md:w-3 md:h-3" />
                                    {invoice.date}
                                  </div>
                                </div>
                                <div className="md:hidden flex items-center gap-2">
                                  {invoice.debt > 0 && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenPaymentModal('SINGLE', invoice.id, invoice.debt);
                                      }}
                                      className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shrink-0"
                                      title="Thu nợ đơn này"
                                    >
                                      <CreditCard size={14} />
                                    </button>
                                  )}
                                  <div className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 shrink-0">
                                    ĐÃ XUẤT
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6 border-t md:border-t-0 border-slate-50 pt-2 md:pt-0">
                                <div className="text-left md:text-right">
                                  <p className="text-[9px] md:text-[10px] font-medium text-slate-400 tracking-tight md:mb-0.5">Tổng tiền</p>
                                  <p className="font-bold text-slate-800 text-xs md:text-sm">{formatNumber(invoice.total)}đ</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] md:text-[10px] font-medium text-slate-400 tracking-tight md:mb-0.5">Còn nợ</p>
                                  <p className={`font-bold text-xs md:text-sm ${invoice.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {formatNumber(invoice.debt)}đ
                                  </p>
                                </div>
                                <div className="hidden md:flex items-center gap-2">
                                  {invoice.debt > 0 && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenPaymentModal('SINGLE', invoice.id, invoice.debt);
                                      }}
                                      className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                                      title="Thu nợ đơn này"
                                    >
                                      <CreditCard size={14} />
                                    </button>
                                  )}
                                  <div className="px-3 py-1 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600">
                                    Đã xuất
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 uppercase">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-3 bg-[#991b1b] text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center md:p-4 p-0 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-2xl md:rounded-xl rounded-none shadow-2xl overflow-hidden flex flex-col h-full md:max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="text-pink-600" size={20} />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Chi tiết hóa đơn {selectedInvoice.id}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePrint({
                    title: 'HÓA ĐƠN BÁN HÀNG',
                    id: selectedInvoice.id,
                    date: selectedInvoice.date,
                    partner: selectedInvoice.customer,
                    phone: selectedInvoice.phone,
                    items: selectedInvoice.items.map(i => ({ ...i, total: i.qty * i.price })),
                    total: selectedInvoice.total,
                    paid: selectedInvoice.paid,
                    debt: selectedInvoice.debt,
                    type: 'HOA_DON'
                  })}
                  className="w-10 h-10 bg-white border border-slate-200 text-slate-400 rounded-full hover:bg-slate-50 transition-colors flex items-center justify-center"
                >
                  <Printer size={20} />
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="grid grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Khách hàng</p>
                  <p className="font-bold text-slate-800 text-xs md:text-sm">{selectedInvoice.customer}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Ngày bán</p>
                  <p className="font-black text-slate-800 text-xs md:text-sm">{selectedInvoice.date}</p>
                </div>
              </div>

              <div className="mb-4 md:mb-6 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-y border-slate-200">
                      <th className="p-2 md:p-3 text-[10px] md:text-sm font-bold text-slate-700 w-12 text-center">STT</th>
                      <th className="p-2 md:p-3 text-[10px] md:text-sm font-bold text-slate-700">Tên Sản Phẩm</th>
                      <th className="p-2 md:p-3 text-[10px] md:text-sm font-bold text-slate-700 text-center">Số Lượng</th>
                      <th className="p-2 md:p-3 text-[10px] md:text-sm font-bold text-slate-700 text-right">Đơn Giá</th>
                      <th className="p-2 md:p-3 text-[10px] md:text-sm font-bold text-slate-700 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <tr className="border-b border-slate-50">
                          <td className="p-2 md:p-3 text-center text-[10px] md:text-sm text-slate-600 font-medium">{idx + 1}</td>
                          <td className="p-2 md:p-3">
                            <p className="font-medium text-[10px] md:text-sm text-slate-800">{item.name}</p>
                          </td>
                          <td className="p-2 md:p-3 text-center text-[10px] md:text-sm text-slate-600 font-medium">{item.qty}</td>
                          <td className="p-2 md:p-3 text-right text-[10px] md:text-sm text-slate-600 font-medium">{formatNumber(item.price)} <span className="underline">đ</span></td>
                          <td className="p-2 md:p-3 text-right text-[10px] md:text-sm text-slate-800 font-bold">{formatNumber(item.qty * item.price)} <span className="underline">đ</span></td>
                        </tr>
                        {item.sn && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={5} className="p-1 px-12">
                              <div className="flex items-center gap-1.5 opacity-60">
                                <span className="text-[9px] font-mono text-slate-500">
                                  SN: {Array.isArray(item.sn) ? item.sn.join(', ') : item.sn}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200">
                      <td colSpan={3}></td>
                      <td className="p-2 md:p-3 text-right text-[10px] md:text-sm font-bold text-slate-700">Tổng:</td>
                      <td className="p-2 md:p-3 text-right text-[10px] md:text-sm font-bold text-slate-800">{formatNumber(selectedInvoice.total)} <span className="underline">đ</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="space-y-1.5 md:space-y-2 py-4 border-t border-slate-200">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Tạm tính (chưa VAT):</span>
                  <span className="font-medium text-[11px] md:text-sm text-slate-800">{formatNumber(selectedInvoice.total)} <span className="underline">đ</span></span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Tổng tiền hàng:</span>
                  <span className="font-medium text-[11px] md:text-sm text-slate-800">{formatNumber(selectedInvoice.total)} <span className="underline">đ</span></span>
                </div>
                
                <div className="flex justify-between items-center pt-3 mt-2 px-2 border-t border-slate-100 italic font-bold">
                  <span className="text-sm md:text-2xl font-black text-slate-800 uppercase tracking-tight">TỔNG TIỀN:</span>
                  <span className="text-sm md:text-2xl font-black text-blue-600 tracking-tighter">{formatNumber(selectedInvoice.total)} <span className="underline">đ</span></span>
                </div>

                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Đã thanh toán:</span>
                  <span className="font-bold text-[11px] md:text-sm text-emerald-600">{formatNumber(selectedInvoice.paid)} <span className="underline">đ</span></span>
                </div>

                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] md:text-sm text-slate-600 font-medium">Còn nợ:</span>
                  <span className="font-bold text-[11px] md:text-sm text-red-600">{formatNumber(selectedInvoice.debt)} <span className="underline">đ</span></span>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-slate-100 flex justify-end gap-2 md:gap-3 bg-slate-50 shrink-0">
              {selectedInvoice.debt > 0 && (
                <button 
                  onClick={() => handleOpenPaymentModal('SINGLE', selectedInvoice.id, selectedInvoice.debt)}
                  className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-emerald-600 text-white rounded-lg font-black uppercase text-[10px] md:text-xs tracking-widest shadow-md shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  <CreditCard size={14} className="md:w-4 md:h-4" /> Thu nợ
                </button>
              )}
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-[#991b1b] text-white rounded-lg font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-[#7f1d1d] transition-all text-center"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md print:hidden">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800 tracking-tighter uppercase">Thu nợ khách hàng</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Số tiền thu</label>
                <input 
                  type="text" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(formatNumber(parseFormattedNumber(e.target.value)))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold outline-none focus:border-emerald-400 text-emerald-600 shadow-inner" 
                  placeholder="0" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Ngày thu</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="date" 
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black outline-none focus:border-blue-400 text-slate-700 shadow-inner" 
                  />
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-[9px] text-blue-600 font-bold leading-relaxed">
                  {paymentType === 'ALL' 
                    ? "Hệ thống sẽ tự động trừ nợ cho các hóa đơn cũ nhất trước (FIFO)."
                    : "Số tiền sẽ được trừ trực tiếp vào hóa đơn đang chọn."}
                </p>
              </div>
              <button 
                onClick={executePayment}
                className="w-full bg-emerald-600 text-white py-4 rounded-lg font-black shadow-lg shadow-emerald-100 uppercase text-xs tracking-widest mt-2 active:scale-95 transition-all hover:bg-emerald-700"
              >
                XÁC NHẬN THU NỢ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-white w-full max-w-md md:rounded-xl rounded-none shadow-2xl overflow-hidden p-6 md:p-8 flex flex-col h-full md:max-h-[95vh] animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-black text-slate-800 tracking-tighter uppercase">
                {editingCustomerId ? 'Cập nhật Khách Hàng' : 'Thêm Khách Hàng'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tên khách hàng</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black outline-none focus:border-blue-400 uppercase shadow-inner" 
                  placeholder="Tên khách hàng..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Số điện thoại</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black outline-none focus:border-blue-400 uppercase shadow-inner" 
                  placeholder="Số điện thoại..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Địa chỉ</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black outline-none focus:border-blue-400 shadow-inner" 
                  placeholder="Địa chỉ..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Khu vực (Local)</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black outline-none focus:border-blue-400 shadow-inner" 
                  placeholder="Khu vực..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Ghi chú</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black outline-none focus:border-blue-400 shadow-inner min-h-[80px]" 
                  placeholder="Ghi chú..." 
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 shrink-0">
              <button 
                onClick={handleSave}
                className="flex-1 bg-emerald-600 text-white py-3.5 rounded-lg font-black shadow-md shadow-emerald-200 uppercase text-[11px] tracking-widest active:scale-95 transition-all hover:bg-emerald-700"
              >
                {editingCustomerId ? 'CẬP NHẬT' : 'LƯU'}
              </button>
              <button 
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="flex-1 py-3.5 bg-[#991b1b] text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:bg-[#7f1d1d] transition-colors active:scale-95 shadow-md shadow-red-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Floating Action Button */}
      <button 
        onClick={() => { resetForm(); setIsModalOpen(true); }}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 z-40 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

