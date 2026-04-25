import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rubi_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rubi_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login:         (email, password) => api.post('/auth/login', { email, password }),
  register:      (name, email, password) => api.post('/users', { name, email, password }),
  verify:        (email, code) => api.post('/users/verificar', { email, code }),
  resendCode:    (email) => api.post('/users/reenviar', { email }),
  me:            () => api.get('/users/me'),
  editProfile:   (name, telegramId) => api.put('/users/me', { name, telegramId }),
  deleteAccount: () => api.delete('/users/me'),
}

// ── Accounts ─────────────────────────────────────────────────────────────
export const accountsAPI = {
  list:               (includePartner = false) => api.get(`/accounts?includePartner=${includePartner}`),
  create:             (data) => api.post('/accounts', data),
  edit:               (id, data) => api.put(`/accounts/${id}`, data),
  delete:             (id) => api.delete(`/accounts/${id}`),
  toggleVisibility:   (id) => api.patch(`/accounts/${id}/visibility`),
  setBalance:         (id, amount) => api.patch(`/accounts/${id}/balance?amount=${amount}`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get:      (month, year) => api.get(`/dashboard?month=${month}&year=${year}`),
  getCouple:(month, year) => api.get(`/dashboard/casal?month=${month}&year=${year}`),
}

// ── Transactions ─────────────────────────────────────────────────────────
export const transactionsAPI = {
  list:     (month, year, type = null, categoryId = null) => {
    let url = `/transactions?month=${month}&year=${year}`
    if (type)       url += `&type=${type}`
    if (categoryId) url += `&categoryId=${categoryId}`
    return api.get(url)
  },
  create:   (data, parcelas = 1) => api.post(`/transactions?parcelas=${parcelas}`, data),
  delete:   (id) => api.delete(`/transactions/${id}`),
  activate: (simulationId) => api.post(`/transactions/efetivar/${simulationId}`),
}

// ── Installments ─────────────────────────────────────────────────────────
export const installmentsAPI = {
  pay:     (id) => api.patch(`/installments/${id}/pay`),
  reverse: (id) => api.patch(`/installments/${id}/estornar`),
  split:   (id, valorPayer1, idPayer2) =>
    api.post(`/installments/${id}/split?valorPayer1=${valorPayer1}&idPayer2=${idPayer2}`),
  assume:  (id, novoPayerId) =>
    api.post(`/installments/${id}/assumir?novoPayerId=${novoPayerId}`),
}

// ── Categories ────────────────────────────────────────────────────────────
export const categoriesAPI = {
  list:       () => api.get('/categories'),
  listCouple: () => api.get('/categories/casal'),
  create:     (data) => api.post('/categories', data),
  edit:       (id, data) => api.put(`/categories/${id}`, data),
  delete:     (id) => api.delete(`/categories/${id}`),
}

// ── Budgets ───────────────────────────────────────────────────────────────
export const budgetsAPI = {
  status: (month, year) => api.get(`/budgets/status?month=${month}&year=${year}`),
  create: (data) => api.post('/budgets', data),
  edit:   (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
}

// ── Invoices ──────────────────────────────────────────────────────────────
export const invoicesAPI = {
  listByAccount: (accountId) => api.get(`/invoices/account/${accountId}`),
  pending:       () => api.get('/invoices/pending'),
  pay:           (invoiceId, valor, sourceAccountId) =>
    api.post(`/invoices/${invoiceId}/pay?valor=${valor}&sourceAccountId=${sourceAccountId}`),
}

// ── Investments ───────────────────────────────────────────────────────────
export const investmentsAPI = {
  summary:    () => api.get('/investments/summary'),
  summaryConta:(id) => api.get(`/investments/summary/${id}`),
  history:    (id) => api.get(`/investments/history/${id}`),
  entry:      (data) => api.post('/investments/entry', data),
  projection: (months = 12) => api.get(`/investments/projection?months=${months}`),
}

// ── Recurring ─────────────────────────────────────────────────────────────
export const recurringAPI = {
  list:       () => api.get('/recurring'),
  create:     (data) => api.post('/recurring', data),
  materialize:(id, month, year, actualAmount = null) => {
    let url = `/recurring/${id}/materialize?month=${month}&year=${year}`
    if (actualAmount != null) url += `&actualAmount=${actualAmount}`
    return api.post(url)
  },
}

// ── Loans ─────────────────────────────────────────────────────────────────
export const loansAPI = {
  list:           () => api.get('/loans'),
  totalToReceive: () => api.get('/loans/total-a-receber'),
  lendToThird:    (data) => api.post('/loans/out', data),
  selfLoan:       (data) => api.post('/loans/self', data),
  receive:        (id, valor) => api.post(`/loans/${id}/receive?valor=${valor}`),
  forgive:        (id) => api.post(`/loans/${id}/forgive`),
}

// ── Partnership ───────────────────────────────────────────────────────────
export const partnershipAPI = {
  invite:   () => api.post('/partnerships/invite'),
  accept:   (code) => api.post(`/partnerships/accept?code=${code}`),
  dissolve: () => api.delete('/partnerships/me'),
}

// ── Recurring ─────────────────────────────────────────────────────────────
export const recurringAPI = {
  list:       () => api.get('/recurring'),
  create:     (data) => api.post('/recurring', data),
  edit:       (id, data) => api.put(`/recurring/${id}`, data),
  delete:     (id) => api.delete(`/recurring/${id}`),
  materialize:(id, month, year, actualAmount = null) => {
  }
}

// ── Audit ─────────────────────────────────────────────────────────────────
export const auditAPI = {
  list: (page = 0, size = 20) => api.get(`/audit?page=${page}&size=${size}`),
}