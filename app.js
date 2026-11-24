/**
 * PulseSales Analytics Dashboard
 * Vanilla JavaScript Engine: Web Storage, Analytics Calculations, Interactive Charts, and CRUD Management.
 */

(function () {
  'use strict';

  // Storage Key
  const STORAGE_KEY = 'pulse_sales_dashboard_records_v1';

  // State Management
  const state = {
    records: [],
    filteredRecords: [],
    activeFilters: {
      datePreset: 'last30',
      startDate: null,
      endDate: null,
      category: 'all',
      region: 'all',
      channel: 'all',
      status: 'all',
    },
    trendMetric: 'revenue', // 'revenue' | 'profit' | 'orders'
    geoMetric: 'region',    // 'region' | 'channel'
    table: {
      search: '',
      sortColumn: 'date',
      sortOrder: 'desc',
      page: 1,
      pageSize: 25,
    },
    charts: {
      trend: null,
      category: null,
      topProducts: null,
      regionChannel: null,
    },
    importFileContent: null,
    importFileType: null,
  };

  // Helper: Format Date YYYY-MM-DD
  function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper: Format Currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }

  // Helper: Format Number
  function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num || 0);
  }

  // Generate Initial Realistic Dataset relative to current date
  function generateSeedData() {
    const today = new Date();
    const productsCatalog = [
      { name: 'CloudSync Pro Enterprise', category: 'Software', price: 299.0, cost: 45.0 },
      { name: 'UltraHD Curved Display 34"', category: 'Electronics', price: 649.0, cost: 380.0 },
      { name: 'ErgoDynamic Office Chair', category: 'Industrial', price: 420.0, cost: 180.0 },
      { name: 'CyberShield Endpoint Suite', category: 'Software', price: 180.0, cost: 25.0 },
      { name: 'AcousticANC Wireless Headset', category: 'Electronics', price: 199.0, cost: 75.0 },
      { name: 'Apex Runner Performance Shoes', category: 'Apparel', price: 135.0, cost: 40.0 },
      { name: 'SmartFlow IoT Hub Controller', category: 'Electronics', price: 89.0, cost: 32.0 },
      { name: 'Artisan Espresso Coffee Maker', category: 'Home & Kitchen', price: 349.0, cost: 160.0 },
      { name: 'Merino Wool Climate Jacket', category: 'Apparel', price: 220.0, cost: 70.0 },
      { name: 'HydraGlow Skin Recovery Serum', category: 'Beauty & Personal', price: 68.0, cost: 14.0 },
      { name: 'Compact Air Purifier Max', category: 'Home & Kitchen', price: 179.0, cost: 85.0 },
      { name: 'Precision Industrial Caliper', category: 'Industrial', price: 95.0, cost: 35.0 },
      { name: 'Botanical Hair Therapy Kit', category: 'Beauty & Personal', price: 54.0, cost: 12.0 },
    ];

    const customerNames = [
      'Alexander Wright', 'Sophia Chen', 'Liam O\'Connor', 'Emma Watson',
      'Mateo Hernandez', 'Aaliyah Khan', 'Lucas Silva', 'Elena Rostova',
      'Oliver Hansen', 'Amara Okafor', 'Noah Kim', 'Isabella Morales',
      'Julian Vance', 'Clara Beaumont', 'Ethan Miller', 'Mia Tanaka'
    ];

    const regions = ['North America', 'Europe', 'Asia-Pacific', 'Latin America', 'Middle East & Africa'];
    const channels = ['Online Web', 'Direct Sales', 'Marketplace', 'Partner Referral', 'Wholesale'];
    const statuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Pending', 'Refunded', 'Cancelled'];

    const records = [];
    let orderSeq = 1000;

    // Generate ~55 distributed sales over the last 90 days
    for (let i = 0; i < 55; i++) {
      orderSeq++;
      // days ago from 0 up to 88
      const daysAgo = Math.floor(Math.pow(Math.random(), 1.2) * 88);
      const saleDate = new Date(today);
      saleDate.setDate(today.getDate() - daysAgo);

      const product = productsCatalog[Math.floor(Math.random() * productsCatalog.length)];
      const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const qty = Math.random() < 0.75 ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 8) + 2;
      const unitPrice = product.price;
      const unitCost = product.cost;
      const total = Number((unitPrice * qty).toFixed(2));
      const profit = Number(((unitPrice - unitCost) * qty).toFixed(2));

      records.push({
        id: `ORD-${saleDate.getFullYear()}-${orderSeq}`,
        date: formatDate(saleDate),
        customer,
        product: product.name,
        category: product.category,
        region,
        channel,
        qty,
        unitPrice,
        unitCost,
        total,
        profit,
        status,
      });
    }

    // Sort by date descending
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    return records;
  }

  // Load records from LocalStorage
  function loadRecords() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read from localStorage, initializing fresh data', err);
    }
    const seed = generateSeedData();
    saveRecords(seed);
    return seed;
  }

  // Save records to LocalStorage
  function saveRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error('Failed to save to localStorage', err);
      showToast('Error saving data to local storage', 'error');
    }
  }

  // Calculate Date Bounds for Presets
  function getDateBounds(preset, customStart, customEnd) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    let fromDate = null;
    let toDate = formatDate(today);

    if (preset === 'today') {
      fromDate = formatDate(today);
    } else if (preset === 'last7') {
      start.setDate(today.getDate() - 6);
      fromDate = formatDate(start);
    } else if (preset === 'last30') {
      start.setDate(today.getDate() - 29);
      fromDate = formatDate(start);
    } else if (preset === 'quarter') {
      start.setDate(today.getDate() - 89);
      fromDate = formatDate(start);
    } else if (preset === 'year') {
      const firstOfYear = new Date(today.getFullYear(), 0, 1);
      fromDate = formatDate(firstOfYear);
    } else if (preset === 'custom') {
      fromDate = customStart || null;
      toDate = customEnd || formatDate(today);
    } else {
      // all time
      fromDate = null;
      toDate = null;
    }

    return { fromDate, toDate };
  }

  // Calculate prior equivalent period date bounds for comparison
  function getPriorDateBounds(fromDate, toDate) {
    if (!fromDate || !toDate) return null;
    const currentFrom = new Date(fromDate);
    const currentTo = new Date(toDate);
    const diffTime = Math.abs(currentTo - currentFrom);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const priorTo = new Date(currentFrom);
    priorTo.setDate(priorTo.getDate() - 1);

    const priorFrom = new Date(priorTo);
    priorFrom.setDate(priorFrom.getDate() - diffDays + 1);

    return {
      fromDate: formatDate(priorFrom),
      toDate: formatDate(priorTo),
    };
  }

  // Populate dynamic category and region filters
  function populateFilterDropdowns() {
    const categories = new Set();
    const regions = new Set();
    const channels = new Set();

    state.records.forEach(r => {
      if (r.category) categories.add(r.category);
      if (r.region) regions.add(r.region);
      if (r.channel) channels.add(r.channel);
    });

    const categorySelect = document.getElementById('filterCategory');
    const regionSelect = document.getElementById('filterRegion');
    const channelSelect = document.getElementById('filterChannel');

    // Keep current selected value
    const curCat = categorySelect.value;
    const curReg = regionSelect.value;
    const curChan = channelSelect.value;

    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    Array.from(categories).sort().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === curCat) opt.selected = true;
      categorySelect.appendChild(opt);
    });

    regionSelect.innerHTML = '<option value="all">All Regions</option>';
    Array.from(regions).sort().forEach(reg => {
      const opt = document.createElement('option');
      opt.value = reg;
      opt.textContent = reg;
      if (reg === curReg) opt.selected = true;
      regionSelect.appendChild(opt);
    });

    channelSelect.innerHTML = '<option value="all">All Channels</option>';
    Array.from(channels).sort().forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch;
      opt.textContent = ch;
      if (ch === curChan) opt.selected = true;
      channelSelect.appendChild(opt);
    });
  }

  // Filter records based on state filters
  function filterRecords() {
    const { fromDate, toDate } = getDateBounds(
      state.activeFilters.datePreset,
      state.activeFilters.startDate,
      state.activeFilters.endDate
    );

    state.filteredRecords = state.records.filter(item => {
      // Date filter
      if (fromDate && item.date < fromDate) return false;
      if (toDate && item.date > toDate) return false;

      // Category filter
      if (state.activeFilters.category !== 'all' && item.category !== state.activeFilters.category) {
        return false;
      }

      // Region filter
      if (state.activeFilters.region !== 'all' && item.region !== state.activeFilters.region) {
        return false;
      }

      // Channel filter
      if (state.activeFilters.channel !== 'all' && item.channel !== state.activeFilters.channel) {
        return false;
      }

      // Status filter
      if (state.activeFilters.status !== 'all' && item.status !== state.activeFilters.status) {
        return false;
      }

      return true;
    });

    // Reset table pagination to page 1
    state.table.page = 1;

    // Update entire dashboard view
    updateKPIs(fromDate, toDate);
    updateCharts();
    renderTable();
  }

  // Calculate prior period records for trend calculation
  function getPriorPeriodRecords(fromDate, toDate) {
    const priorBounds = getPriorDateBounds(fromDate, toDate);
    if (!priorBounds) return [];

    return state.records.filter(item => {
      if (item.date < priorBounds.fromDate || item.date > priorBounds.toDate) return false;
      if (state.activeFilters.category !== 'all' && item.category !== state.activeFilters.category) return false;
      if (state.activeFilters.region !== 'all' && item.region !== state.activeFilters.region) return false;
      if (state.activeFilters.channel !== 'all' && item.channel !== state.activeFilters.channel) return false;
      if (state.activeFilters.status !== 'all' && item.status !== state.activeFilters.status) return false;
      return true;
    });
  }

  // Update KPIs and Growth indicators
  function updateKPIs(fromDate, toDate) {
    const current = state.filteredRecords;
    const prior = getPriorPeriodRecords(fromDate, toDate);

    // Calculate Current Period Metrics
    // Active orders (Completed + Pending count towards revenue)
    const validSales = current.filter(r => r.status === 'Completed' || r.status === 'Pending');
    const completedSales = current.filter(r => r.status === 'Completed');
    const refundedSales = current.filter(r => r.status === 'Refunded');

    const totalRevenue = validSales.reduce((acc, r) => acc + (r.total || 0), 0);
    const totalProfit = completedSales.reduce((acc, r) => acc + (r.profit || 0), 0);
    const totalOrders = current.length;
    const totalUnits = current.reduce((acc, r) => acc + (r.qty || 0), 0);
    const aov = validSales.length > 0 ? totalRevenue / validSales.length : 0;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalRefunds = refundedSales.reduce((acc, r) => acc + (r.total || 0), 0);
    const refundRate = totalRevenue > 0 ? (totalRefunds / (totalRevenue + totalRefunds)) * 100 : 0;

    // Prior Period Metrics
    const priorValidSales = prior.filter(r => r.status === 'Completed' || r.status === 'Pending');
    const priorRevenue = priorValidSales.reduce((acc, r) => acc + (r.total || 0), 0);
    const priorOrders = prior.length;

    // Growth Percentages
    function getGrowth(currVal, priorVal) {
      if (!priorVal || priorVal === 0) {
        return currVal > 0 ? '+100%' : '0.0%';
      }
      const diff = ((currVal - priorVal) / priorVal) * 100;
      return (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
    }

    const revGrowth = getGrowth(totalRevenue, priorRevenue);
    const ordersGrowth = getGrowth(totalOrders, priorOrders);

    // DOM Updates
    document.getElementById('kpiRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('kpiProfit').textContent = formatCurrency(totalProfit);
    document.getElementById('kpiProfitMargin').textContent = `Margin: ${margin.toFixed(1)}%`;
    document.getElementById('kpiOrders').textContent = formatNumber(totalOrders);
    document.getElementById('kpiAOV').textContent = formatCurrency(aov);
    document.getElementById('kpiUnitsSold').textContent = `${formatNumber(totalUnits)} units sold`;
    document.getElementById('kpiRefunds').textContent = formatCurrency(totalRefunds);
    document.getElementById('kpiRefundRate').textContent = `${refundRate.toFixed(1)}%`;

    // Growth Badges
    const revBadge = document.getElementById('kpiRevenueGrowth');
    revBadge.textContent = revGrowth;
    revBadge.className = `badge-growth ${revGrowth.startsWith('+') ? 'badge-positive' : 'badge-negative'}`;

    const ordersBadge = document.getElementById('kpiOrdersGrowth');
    ordersBadge.textContent = ordersGrowth;
    ordersBadge.className = `badge-growth ${ordersGrowth.startsWith('+') ? 'badge-positive' : 'badge-negative'}`;
  }

  // Build / Update Charts using Chart.js
  function updateCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library is not loaded');
      return;
    }

    renderTrendChart();
    renderCategoryChart();
    renderTopProductsChart();
    renderRegionChannelChart();
  }

  // Trend Chart (Line / Area)
  function renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    // Aggregate by Date
    const dateMap = {};
    const sorted = [...state.filteredRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(r => {
      if (!dateMap[r.date]) {
        dateMap[r.date] = { revenue: 0, profit: 0, orders: 0 };
      }
      if (r.status === 'Completed' || r.status === 'Pending') {
        dateMap[r.date].revenue += r.total || 0;
      }
      if (r.status === 'Completed') {
        dateMap[r.date].profit += r.profit || 0;
      }
      dateMap[r.date].orders += 1;
    });

    const labels = Object.keys(dateMap);
    let datasetLabel = 'Revenue';
    let dataValues = [];
    let borderColor = '#3b82f6';
    let backgroundColor = 'rgba(59, 130, 246, 0.15)';

    if (state.trendMetric === 'profit') {
      datasetLabel = 'Net Profit';
      dataValues = labels.map(d => dateMap[d].profit);
      borderColor = '#10b981';
      backgroundColor = 'rgba(16, 185, 129, 0.15)';
    } else if (state.trendMetric === 'orders') {
      datasetLabel = 'Orders Count';
      dataValues = labels.map(d => dateMap[d].orders);
      borderColor = '#a78bfa';
      backgroundColor = 'rgba(167, 139, 250, 0.15)';
    } else {
      datasetLabel = 'Revenue';
      dataValues = labels.map(d => dateMap[d].revenue);
      borderColor = '#3b82f6';
      backgroundColor = 'rgba(59, 130, 246, 0.15)';
    }

    if (state.charts.trend) {
      state.charts.trend.destroy();
    }

    state.charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['No Data'],
        datasets: [{
          label: datasetLabel,
          data: labels.length ? dataValues : [0],
          borderColor: borderColor,
          backgroundColor: backgroundColor,
          fill: true,
          tension: 0.35,
          pointRadius: labels.length > 20 ? 2 : 4,
          pointHoverRadius: 6,
          pointBackgroundColor: borderColor,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function (context) {
                if (state.trendMetric === 'orders') {
                  return `${context.dataset.label}: ${context.raw} orders`;
                }
                return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#1c273c', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              maxTicksLimit: 10,
              font: { size: 11 },
            },
          },
          y: {
            grid: { color: '#1c273c', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: function (val) {
                if (state.trendMetric === 'orders') return val;
                return '$' + (val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val);
              },
            },
          },
        },
      },
    });
  }

  // Category Doughnut Chart
  function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const catMap = {};
    state.filteredRecords.forEach(r => {
      if (r.status !== 'Cancelled' && r.status !== 'Refunded') {
        catMap[r.category] = (catMap[r.category] || 0) + (r.total || 0);
      }
    });

    const labels = Object.keys(catMap);
    const dataValues = labels.map(l => catMap[l]);
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    if (state.charts.category) {
      state.charts.category.destroy();
    }

    state.charts.category = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No Data'],
        datasets: [{
          data: labels.length ? dataValues : [1],
          backgroundColor: labels.length ? palette.slice(0, labels.length) : ['#222f46'],
          borderColor: '#141c2e',
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#cbd5e1',
              boxWidth: 12,
              padding: 14,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                return ` ${formatCurrency(context.raw)} (${percent}%)`;
              },
            },
          },
        },
        cutout: '68%',
      },
    });
  }

  // Top Products Horizontal Bar Chart
  function renderTopProductsChart() {
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) return;

    const prodMap = {};
    state.filteredRecords.forEach(r => {
      if (r.status === 'Completed' || r.status === 'Pending') {
        prodMap[r.product] = (prodMap[r.product] || 0) + (r.total || 0);
      }
    });

    // Sort descending and pick top 5
    const sortedProds = Object.entries(prodMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const labels = sortedProds.map(p => p[0]);
    const values = sortedProds.map(p => p[1]);

    if (state.charts.topProducts) {
      state.charts.topProducts.destroy();
    }

    state.charts.topProducts = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No Data'],
        datasets: [{
          data: labels.length ? values : [0],
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: function (ctx) {
                return ` Revenue: ${formatCurrency(ctx.raw)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#1c273c', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: function (val) {
                return '$' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val);
              },
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: '#cbd5e1',
              font: { size: 11 },
              callback: function (val, index) {
                const label = this.getLabelForValue(val);
                return label.length > 20 ? label.substr(0, 18) + '...' : label;
              },
            },
          },
        },
      },
    });
  }

  // Region / Channel Bar Chart
  function renderRegionChannelChart() {
    const ctx = document.getElementById('regionChannelChart');
    if (!ctx) return;

    const key = state.geoMetric; // 'region' or 'channel'
    const metricMap = {};

    state.filteredRecords.forEach(r => {
      const val = r[key] || 'Unassigned';
      if (!metricMap[val]) {
        metricMap[val] = { revenue: 0, profit: 0 };
      }
      if (r.status === 'Completed' || r.status === 'Pending') {
        metricMap[val].revenue += r.total || 0;
      }
      if (r.status === 'Completed') {
        metricMap[val].profit += r.profit || 0;
      }
    });

    const labels = Object.keys(metricMap);
    const revData = labels.map(l => metricMap[l].revenue);
    const profData = labels.map(l => metricMap[l].profit);

    if (state.charts.regionChannel) {
      state.charts.regionChannel.destroy();
    }

    state.charts.regionChannel = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No Data'],
        datasets: [
          {
            label: 'Revenue',
            data: labels.length ? revData : [0],
            backgroundColor: '#3b82f6',
            borderRadius: 6,
          },
          {
            label: 'Net Profit',
            data: labels.length ? profData : [0],
            backgroundColor: '#10b981',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              boxWidth: 12,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: function (ctx) {
                return ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#1c273c', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
            },
          },
          y: {
            grid: { color: '#1c273c', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: function (val) {
                return '$' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val);
              },
            },
          },
        },
      },
    });
  }

  // Transactions Data Table Handling
  function renderTable() {
    const tableBody = document.getElementById('transactionsTableBody');
    const emptyState = document.getElementById('tableEmptyState');
    const recordCountBadge = document.getElementById('tableRecordCount');

    // 1. Search Filtering
    let list = [...state.filteredRecords];
    const query = state.table.search.trim().toLowerCase();

    if (query) {
      list = list.filter(item => {
        return (
          (item.id && item.id.toLowerCase().includes(query)) ||
          (item.customer && item.customer.toLowerCase().includes(query)) ||
          (item.product && item.product.toLowerCase().includes(query)) ||
          (item.category && item.category.toLowerCase().includes(query)) ||
          (item.region && item.region.toLowerCase().includes(query)) ||
          (item.channel && item.channel.toLowerCase().includes(query)) ||
          (item.status && item.status.toLowerCase().includes(query))
        );
      });
    }

    recordCountBadge.textContent = `Showing ${list.length} orders`;

    // 2. Sorting
    const { sortColumn, sortOrder } = state.table;
    list.sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (sortColumn === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (sortColumn === 'total' || sortColumn === 'qty' || sortColumn === 'profit') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // 3. Empty State check
    if (list.length === 0) {
      tableBody.innerHTML = '';
      emptyState.style.display = 'flex';
      renderPagination(0, 0, 0);
      return;
    } else {
      emptyState.style.display = 'none';
    }

    // 4. Pagination
    const totalRecords = list.length;
    const pageSize = state.table.pageSize;
    const totalPages = Math.ceil(totalRecords / pageSize);
    if (state.table.page > totalPages) {
      state.table.page = totalPages || 1;
    }

    const startIndex = (state.table.page - 1) * pageSize;
    const pageRecords = list.slice(startIndex, startIndex + pageSize);

    // 5. Render Table Rows
    tableBody.innerHTML = pageRecords.map(item => {
      const statusClass = `status-${(item.status || '').toLowerCase()}`;
      return `
        <tr>
          <td>${item.date}</td>
          <td><span class="order-id-cell">${item.id}</span></td>
          <td><strong>${escapeHtml(item.customer)}</strong></td>
          <td>${escapeHtml(item.product)}</td>
          <td><span class="text-muted">${escapeHtml(item.category)}</span></td>
          <td><span class="text-muted">${escapeHtml(item.region)}</span></td>
          <td><span class="text-muted">${escapeHtml(item.channel)}</span></td>
          <td class="text-right">${item.qty}</td>
          <td class="text-right"><strong>${formatCurrency(item.total)}</strong></td>
          <td class="text-center">
            <span class="status-badge ${statusClass}">${escapeHtml(item.status)}</span>
          </td>
          <td>
            <div class="table-row-actions">
              <button class="btn-icon-sm" data-action="view" data-id="${item.id}" title="View Details">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              <button class="btn-icon-sm" data-action="edit" data-id="${item.id}" title="Edit Sale">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-icon-sm btn-icon-danger" data-action="delete" data-id="${item.id}" title="Delete Sale">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderPagination(totalRecords, startIndex, pageRecords.length);
  }

  // Render Pagination Info & Buttons
  function renderPagination(totalRecords, startIndex, count) {
    const info = document.getElementById('paginationInfo');
    const controls = document.getElementById('paginationControls');

    if (totalRecords === 0) {
      info.textContent = 'Showing 0 to 0 of 0 entries';
      controls.innerHTML = '';
      return;
    }

    const end = startIndex + count;
    info.textContent = `Showing ${startIndex + 1} to ${end} of ${totalRecords} entries`;

    const totalPages = Math.ceil(totalRecords / state.table.pageSize);
    const currentPage = state.table.page;

    let html = `
      <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&lsaquo;</button>
    `;

    // Window around current page
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) html += `<span style="padding: 0 4px; color: #64748b;">...</span>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span style="padding: 0 4px; color: #64748b;">...</span>`;
      html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `
      <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>&rsaquo;</button>
    `;

    controls.innerHTML = html;
  }

  // Escape HTML helper
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Show Toast Notification
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // Modal: Add / Edit Sale Form
  function openSaleModal(record = null) {
    const modal = document.getElementById('saleModal');
    const modalTitle = document.getElementById('modalTitle');
    const editIdInput = document.getElementById('editSaleId');
    const orderIdInput = document.getElementById('formOrderId');
    const dateInput = document.getElementById('formDate');
    const customerInput = document.getElementById('formCustomer');
    const productInput = document.getElementById('formProduct');
    const categoryInput = document.getElementById('formCategory');
    const statusInput = document.getElementById('formStatus');
    const regionInput = document.getElementById('formRegion');
    const channelInput = document.getElementById('formChannel');
    const qtyInput = document.getElementById('formQuantity');
    const priceInput = document.getElementById('formUnitPrice');
    const costInput = document.getElementById('formUnitCost');

    if (record) {
      modalTitle.textContent = 'Edit Sale Record';
      editIdInput.value = record.id;
      orderIdInput.value = record.id;
      orderIdInput.readOnly = true;
      dateInput.value = record.date;
      customerInput.value = record.customer;
      productInput.value = record.product;
      categoryInput.value = record.category;
      statusInput.value = record.status;
      regionInput.value = record.region;
      channelInput.value = record.channel;
      qtyInput.value = record.qty;
      priceInput.value = record.unitPrice;
      costInput.value = record.unitCost;
    } else {
      modalTitle.textContent = 'Record New Sale';
      editIdInput.value = '';
      orderIdInput.readOnly = false;
      const today = new Date();
      orderIdInput.value = `ORD-${today.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      dateInput.value = formatDate(today);
      customerInput.value = '';
      productInput.value = '';
      categoryInput.value = 'Electronics';
      statusInput.value = 'Completed';
      regionInput.value = 'North America';
      channelInput.value = 'Online Web';
      qtyInput.value = 1;
      priceInput.value = 120.0;
      costInput.value = 40.0;
    }

    updateFormCalculations();
    modal.style.display = 'flex';
  }

  function closeSaleModal() {
    document.getElementById('saleModal').style.display = 'none';
  }

  function updateFormCalculations() {
    const qty = parseFloat(document.getElementById('formQuantity').value) || 0;
    const price = parseFloat(document.getElementById('formUnitPrice').value) || 0;
    const cost = parseFloat(document.getElementById('formUnitCost').value) || 0;

    const total = qty * price;
    const profit = qty * (price - cost);
    const margin = total > 0 ? (profit / total) * 100 : 0;

    document.getElementById('formCalcTotal').textContent = formatCurrency(total);
    const profitEl = document.getElementById('formCalcProfit');
    profitEl.textContent = `${formatCurrency(profit)} (${margin.toFixed(1)}%)`;

    if (profit < 0) {
      profitEl.className = 'badge-negative';
    } else {
      profitEl.className = 'text-emerald';
    }
  }

  // Modal: View Transaction Details
  function openDetailsModal(record) {
    const modal = document.getElementById('detailsModal');
    const container = document.getElementById('detailsContent');

    container.innerHTML = `
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Order ID</div>
          <div class="detail-value font-mono">${record.id}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Date Placed</div>
          <div class="detail-value">${record.date}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Customer</div>
          <div class="detail-value">${escapeHtml(record.customer)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Status</div>
          <div class="detail-value">
            <span class="status-badge status-${record.status.toLowerCase()}">${escapeHtml(record.status)}</span>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Product</div>
          <div class="detail-value">${escapeHtml(record.product)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Category</div>
          <div class="detail-value">${escapeHtml(record.category)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Region</div>
          <div class="detail-value">${escapeHtml(record.region)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Channel</div>
          <div class="detail-value">${escapeHtml(record.channel)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Unit Price & Cost</div>
          <div class="detail-value">${formatCurrency(record.unitPrice)} (Cost: ${formatCurrency(record.unitCost)})</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Quantity</div>
          <div class="detail-value">${record.qty} items</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Total Amount</div>
          <div class="detail-value text-emerald font-bold" style="font-size: 16px;">${formatCurrency(record.total)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Estimated Gross Profit</div>
          <div class="detail-value text-emerald">${formatCurrency(record.profit)}</div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
  }

  // Export CSV Data
  function exportCSV() {
    if (state.filteredRecords.length === 0) {
      showToast('No records available to export', 'error');
      return;
    }

    const headers = ['Order ID', 'Date', 'Customer', 'Product', 'Category', 'Region', 'Channel', 'Quantity', 'Unit Price', 'Unit Cost', 'Total', 'Profit', 'Status'];
    const rows = state.filteredRecords.map(r => [
      `"${r.id}"`,
      `"${r.date}"`,
      `"${(r.customer || '').replace(/"/g, '""')}"`,
      `"${(r.product || '').replace(/"/g, '""')}"`,
      `"${(r.category || '').replace(/"/g, '""')}"`,
      `"${(r.region || '').replace(/"/g, '""')}"`,
      `"${(r.channel || '').replace(/"/g, '""')}"`,
      r.qty,
      r.unitPrice,
      r.unitCost,
      r.total,
      r.profit,
      `"${r.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_analytics_${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${state.filteredRecords.length} records to CSV`, 'success');
  }

  // Modal: Import Data Handling
  function openImportModal() {
    const modal = document.getElementById('importModal');
    const processBtn = document.getElementById('importProcessBtn');
    const fileNameSpan = document.getElementById('selectedFileName');
    const fileInput = document.getElementById('fileImportInput');

    fileInput.value = '';
    fileNameSpan.textContent = '';
    processBtn.disabled = true;
    state.importFileContent = null;
    state.importFileType = null;

    modal.style.display = 'flex';
  }

  function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic CSV tokenizer
      const tokens = [];
      let inQuotes = false;
      let token = '';
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          tokens.push(token.trim().replace(/^"|"$/g, ''));
          token = '';
        } else {
          token += char;
        }
      }
      tokens.push(token.trim().replace(/^"|"$/g, ''));

      if (tokens.length >= 7) {
        const id = tokens[0] || `ORD-IMP-${i}`;
        const date = tokens[1] || formatDate(new Date());
        const customer = tokens[2] || 'Imported Customer';
        const product = tokens[3] || 'Imported Product';
        const category = tokens[4] || 'Other';
        const region = tokens[5] || 'Global';
        const channel = tokens[6] || 'Online Web';
        const qty = parseInt(tokens[7], 10) || 1;
        const unitPrice = parseFloat(tokens[8]) || 50.0;
        const unitCost = parseFloat(tokens[9]) || 20.0;
        const total = parseFloat(tokens[10]) || qty * unitPrice;
        const profit = parseFloat(tokens[11]) || (qty * (unitPrice - unitCost));
        const status = tokens[12] || 'Completed';

        results.push({
          id, date, customer, product, category, region, channel, qty, unitPrice, unitCost, total, profit, status
        });
      }
    }
    return results;
  }

  function processImport() {
    if (!state.importFileContent) return;

    let importedRecords = [];
    try {
      if (state.importFileType === 'json') {
        const parsed = JSON.parse(state.importFileContent);
        if (Array.isArray(parsed)) {
          importedRecords = parsed;
        } else {
          throw new Error('JSON is not an array of records');
        }
      } else {
        importedRecords = parseCSV(state.importFileContent);
      }

      if (!importedRecords || importedRecords.length === 0) {
        showToast('No valid records found in file', 'error');
        return;
      }

      const mode = document.querySelector('input[name="importMode"]:checked').value;
      if (mode === 'replace') {
        state.records = importedRecords;
      } else {
        // Merge without duplicate IDs
        const existingIds = new Set(state.records.map(r => r.id));
        importedRecords.forEach(r => {
          if (!existingIds.has(r.id)) {
            state.records.push(r);
            existingIds.add(r.id);
          }
        });
      }

      saveRecords(state.records);
      populateFilterDropdowns();
      filterRecords();
      closeImportModal();
      showToast(`Successfully processed ${importedRecords.length} records`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to parse file: ' + err.message, 'error');
    }
  }

  // Setup Event Listeners
  function initEventListeners() {
    // Top Action Buttons
    document.getElementById('btnNewSale').addEventListener('click', () => openSaleModal());
    document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
    document.getElementById('btnImportData').addEventListener('click', openImportModal);
    document.getElementById('btnResetData').addEventListener('click', () => {
      if (confirm('Restore default demo dataset? Any custom adjustments will be reset.')) {
        const seed = generateSeedData();
        state.records = seed;
        saveRecords(seed);
        populateFilterDropdowns();
        filterRecords();
        showToast('Demo data restored successfully', 'success');
      }
    });

    // Date Preset Filter
    const datePresetEl = document.getElementById('filterDatePreset');
    const customDateRangeEl = document.getElementById('customDateRange');
    const startDateEl = document.getElementById('filterStartDate');
    const endDateEl = document.getElementById('filterEndDate');

    datePresetEl.addEventListener('change', (e) => {
      state.activeFilters.datePreset = e.target.value;
      if (e.target.value === 'custom') {
        customDateRangeEl.style.display = 'flex';
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        startDateEl.value = formatDate(start);
        endDateEl.value = formatDate(today);
        state.activeFilters.startDate = startDateEl.value;
        state.activeFilters.endDate = endDateEl.value;
      } else {
        customDateRangeEl.style.display = 'none';
        state.activeFilters.startDate = null;
        state.activeFilters.endDate = null;
      }
      filterRecords();
    });

    startDateEl.addEventListener('change', (e) => {
      state.activeFilters.startDate = e.target.value;
      filterRecords();
    });

    endDateEl.addEventListener('change', (e) => {
      state.activeFilters.endDate = e.target.value;
      filterRecords();
    });

    // Dropdown Filters
    document.getElementById('filterCategory').addEventListener('change', (e) => {
      state.activeFilters.category = e.target.value;
      filterRecords();
    });

    document.getElementById('filterRegion').addEventListener('change', (e) => {
      state.activeFilters.region = e.target.value;
      filterRecords();
    });

    document.getElementById('filterChannel').addEventListener('change', (e) => {
      state.activeFilters.channel = e.target.value;
      filterRecords();
    });

    document.getElementById('filterStatus').addEventListener('change', (e) => {
      state.activeFilters.status = e.target.value;
      filterRecords();
    });

    // Clear Filters
    document.getElementById('btnClearFilters').addEventListener('click', () => {
      state.activeFilters.datePreset = 'all';
      state.activeFilters.startDate = null;
      state.activeFilters.endDate = null;
      state.activeFilters.category = 'all';
      state.activeFilters.region = 'all';
      state.activeFilters.channel = 'all';
      state.activeFilters.status = 'all';

      datePresetEl.value = 'all';
      customDateRangeEl.style.display = 'none';
      document.getElementById('filterCategory').value = 'all';
      document.getElementById('filterRegion').value = 'all';
      document.getElementById('filterChannel').value = 'all';
      document.getElementById('filterStatus').value = 'all';

      filterRecords();
      showToast('Filters reset', 'info');
    });

    document.getElementById('btnResetTableFilters').addEventListener('click', () => {
      document.getElementById('btnClearFilters').click();
      document.getElementById('tableSearch').value = '';
      state.table.search = '';
      document.getElementById('btnClearSearch').style.display = 'none';
      renderTable();
    });

    // Chart metric toggles
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.trendMetric = btn.dataset.metric;
        renderTrendChart();
      });
    });

    document.querySelectorAll('.toggle-btn-geo').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn-geo').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.geoMetric = btn.dataset.geo;
        renderRegionChannelChart();
      });
    });

    // Table Search
    const searchInput = document.getElementById('tableSearch');
    const clearSearchBtn = document.getElementById('btnClearSearch');

    searchInput.addEventListener('input', (e) => {
      state.table.search = e.target.value;
      state.table.page = 1;
      clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
      renderTable();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.table.search = '';
      state.table.page = 1;
      clearSearchBtn.style.display = 'none';
      renderTable();
    });

    // Table Page Size
    document.getElementById('tablePageSize').addEventListener('change', (e) => {
      state.table.pageSize = parseInt(e.target.value, 10);
      state.table.page = 1;
      renderTable();
    });

    // Table Sort Headers
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (state.table.sortColumn === col) {
          state.table.sortOrder = state.table.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          state.table.sortColumn = col;
          state.table.sortOrder = 'desc';
        }
        renderTable();
      });
    });

    // Table Row Actions (Event Delegation)
    document.getElementById('transactionsTableBody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const orderId = btn.dataset.id;
      const record = state.records.find(r => r.id === orderId);

      if (!record) return;

      if (action === 'view') {
        openDetailsModal(record);
      } else if (action === 'edit') {
        openSaleModal(record);
      } else if (action === 'delete') {
        if (confirm(`Are you sure you want to delete order ${orderId}?`)) {
          state.records = state.records.filter(r => r.id !== orderId);
          saveRecords(state.records);
          filterRecords();
          showToast(`Order ${orderId} deleted`, 'info');
        }
      }
    });

    // Pagination Click (Event Delegation)
    document.getElementById('paginationControls').addEventListener('click', (e) => {
      const btn = e.target.closest('.page-btn');
      if (!btn || btn.disabled) return;
      const targetPage = parseInt(btn.dataset.page, 10);
      if (targetPage && targetPage !== state.table.page) {
        state.table.page = targetPage;
        renderTable();
      }
    });

    // Modals: Sale Modal
    document.getElementById('modalCloseBtn').addEventListener('click', closeSaleModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeSaleModal);

    // Form Auto-calculations
    ['formQuantity', 'formUnitPrice', 'formUnitCost'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateFormCalculations);
    });

    // Form Submission
    document.getElementById('saleForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('editSaleId').value;
      const orderId = document.getElementById('formOrderId').value.trim();
      const date = document.getElementById('formDate').value;
      const customer = document.getElementById('formCustomer').value.trim();
      const product = document.getElementById('formProduct').value.trim();
      const category = document.getElementById('formCategory').value;
      const status = document.getElementById('formStatus').value;
      const region = document.getElementById('formRegion').value;
      const channel = document.getElementById('formChannel').value;
      const qty = parseInt(document.getElementById('formQuantity').value, 10) || 1;
      const unitPrice = parseFloat(document.getElementById('formUnitPrice').value) || 0;
      const unitCost = parseFloat(document.getElementById('formUnitCost').value) || 0;
      const total = Number((qty * unitPrice).toFixed(2));
      const profit = Number(((unitPrice - unitCost) * qty).toFixed(2));

      if (editId) {
        // Edit existing
        const idx = state.records.findIndex(r => r.id === editId);
        if (idx !== -1) {
          state.records[idx] = {
            id: editId,
            date,
            customer,
            product,
            category,
            status,
            region,
            channel,
            qty,
            unitPrice,
            unitCost,
            total,
            profit,
          };
          showToast(`Order ${editId} updated`, 'success');
        }
      } else {
        // Check for duplicate ID
        if (state.records.some(r => r.id === orderId)) {
          alert('An order with this ID already exists. Please use a unique Order ID.');
          return;
        }
        // Add new
        state.records.unshift({
          id: orderId,
          date,
          customer,
          product,
          category,
          status,
          region,
          channel,
          qty,
          unitPrice,
          unitCost,
          total,
          profit,
        });
        showToast(`Order ${orderId} recorded successfully`, 'success');
      }

      saveRecords(state.records);
      populateFilterDropdowns();
      filterRecords();
      closeSaleModal();
    });

    // Details Modal
    document.getElementById('detailsCloseBtn').addEventListener('click', closeDetailsModal);
    document.getElementById('detailsDismissBtn').addEventListener('click', closeDetailsModal);

    // Import Modal
    document.getElementById('importCloseBtn').addEventListener('click', closeImportModal);
    document.getElementById('importCancelBtn').addEventListener('click', closeImportModal);
    document.getElementById('btnBrowseFile').addEventListener('click', () => {
      document.getElementById('fileImportInput').click();
    });

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileImportInput');
    const fileNameSpan = document.getElementById('selectedFileName');
    const processBtn = document.getElementById('importProcessBtn');

    function handleFile(file) {
      if (!file) return;
      fileNameSpan.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      const ext = file.name.split('.').pop().toLowerCase();
      state.importFileType = ext === 'json' ? 'json' : 'csv';

      const reader = new FileReader();
      reader.onload = function (evt) {
        state.importFileContent = evt.target.result;
        processBtn.disabled = false;
      };
      reader.readAsText(file);
    }

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    processBtn.addEventListener('click', processImport);

    // Global Modal Esc / Outside Click Dismiss
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSaleModal();
        closeDetailsModal();
        closeImportModal();
      }
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  }

  // Application Entry Point
  function init() {
    state.records = loadRecords();
    populateFilterDropdowns();
    initEventListeners();
    filterRecords();
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
