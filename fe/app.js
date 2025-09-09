(() => {
    const $ = (sel, root = document) => root.querySelector(sel);
    const show = el => { if (el) el.hidden = false; };
    const hide = el => { if (el) el.hidden = true; };
    const setBusy = (btn, busy) => {
      if (!btn) return;
      btn.setAttribute('aria-busy', busy ? 'true' : 'false');
      btn.disabled = !!busy;
    };
    const toast = (msg, type = 'success', timeout = 3000) => {
      const wrap = $('#toastContainer');
      if (!wrap) return alert(msg);
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.textContent = msg;
      wrap.appendChild(t);
      setTimeout(() => t.remove(), timeout);
    };
    const pretty = data => typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2);
  
    function renderTo(placeholderId, contentId, content) {
      const placeholder = document.getElementById(placeholderId);
      const contentEl = document.getElementById(contentId);
      if (!contentEl || !placeholder) return;
      hide(placeholder);
      show(contentEl);
      contentEl.textContent = pretty(content);
    }
  
    const connectionStatus = $('#connectionStatus .status-text');
    const connectionDot = $('#connectionStatus .status-dot');
    const baseUrlDisplay = $('#baseUrlDisplay');
    const healthLink = $('#healthLink');
  
    const tokenDisplay = $('#tokenDisplay');
    const tokenCode = $('#tokenCode');
    const tokenCopy = $('#tokenCopy');
  
    const employeesPlaceholder = $('#employeesPlaceholder');
    const employeesList = $('#employeesList');
  
    const reportsPlaceholder = $('#reportsPlaceholder');
    const reportsOut = $('#reportsOut');
  
    const storagePlaceholder = $('#storagePlaceholder');
    const storageOut = $('#storageOut');
  
    const cronPlaceholder = $('#cronPlaceholder');
    const cronOut = $('#cronOut');
  
    const registerForm = $('#registerForm');
    const btnRegister = $('#btnRegister');
    const loginForm = $('#loginForm');
    const btnLogin = $('#btnLogin');
  
    const employeeForm = $('#employeeForm');
    const btnCreateEmployee = $('#btnCreateEmployee');
    const btnListEmployees = $('#btnListEmployees');
  
    const btnTopExperience = $('#btnTopExperience');
    const btnLowExpEngineers = $('#btnLowExpEngineers');
    const btnSalaryByYear = $('#btnSalaryByYear');
    const reportYearInput = $('#reportYear');
  
    const btnStorageHealth = $('#btnStorageHealth');
  
    const btnCronSetup = $('#btnCronSetup');
    const btnCronJobs = $('#btnCronJobs');
    const btnCronStatus = $('#btnCronStatus');

    // Custom cron inputs/buttons
    const cronJobName = $('#cronJobName');
    const cronSchedule = $('#cronSchedule');
    const cronCommand = $('#cronCommand');
    const btnCronCreate = $('#btnCronCreate');
    const btnCronDelete = $('#btnCronDelete');
    const btnCronRefreshAll2 = $('#btnCronRefreshAll2');
    const btnCronExportLatest = $('#btnCronExportLatest');
    const cronCustomPlaceholder = $('#cronCustomPlaceholder');
    const cronCustomOut = $('#cronCustomOut');
  
    const BASE = window.__API_BASE__ || '';
    if (baseUrlDisplay) baseUrlDisplay.textContent = BASE || 'NOT SET';
    if (healthLink) healthLink.href = BASE ? `${BASE}/health` : '#';
  
    let token = '';
  
    const authHeader = () =>
      token ? { Authorization: `Bearer ${token}` } : {};
  
    async function api(path, { method = 'GET', headers = {}, body, timeout = 20000 } = {}) {
      const url = `${BASE}${path}`;
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), timeout);
  
      try {
        const res = await fetch(url, {
          method,
          mode: 'cors',
          credentials: 'omit',
          headers: { 
            'Accept': 'application/json, text/plain, */*',
            ...headers 
          },
          body,
          signal: ctrl.signal
        });
  
        const raw = await res.text();
        let data;
        try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  
        return { ok: res.ok, status: res.status, data };
      } catch (err) {
        return { ok: false, status: 0, data: String(err?.message || err) };
      } finally {
        clearTimeout(id);
      }
    }
  
    (async () => {
      if (!BASE) {
        if (connectionStatus) connectionStatus.textContent = 'No API base URL configured';
        if (connectionDot) connectionDot.style.background = 'hsl(0 65% 50%)';
        return;
      }
      const r = await api('/health', { timeout: 7000 });
      if (r.ok) {
        if (connectionStatus) connectionStatus.textContent = `Health: ${r.status} OK`;
        if (connectionDot) connectionDot.style.background = 'hsl(142 76% 42%)';
      } else {
        if (connectionStatus) connectionStatus.textContent = r.status === 0 ? 'Health: Unreachable' : `Health: ${r.status} ERR`;
        if (connectionDot) connectionDot.style.background = 'hsl(0 65% 50%)';
      }
    })();
  
    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      setBusy(btnRegister, true);
      const body = {
        email: $('#regEmail').value.trim(),
        password: $('#regPassword').value,
        firstName: $('#regFirst').value.trim(),
        lastName: $('#regLast').value.trim(),
      };
      const r = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setBusy(btnRegister, false);
      if (r.ok) {
        toast('Register success', 'success');
      } else {
        toast(`Register failed: ${pretty(r.data)}`, 'error', 4500);
      }
    });
  
    loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setBusy(btnLogin, true);

    const body = {
        email: $('#loginEmail').value.trim(),
        password: $('#loginPassword').value
    };

    const r = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    setBusy(btnLogin, false);

     if (r.ok && r.data && r.data.success && r.data.data && r.data.data.token) {
         token = r.data.data.token;
         tokenCode.textContent = token;
         tokenDisplay.hidden = false;
         toast('Login success', 'success');
     } else {
         token = '';
         tokenDisplay.hidden = true;
         console.error('Login failed:', r);
         const msg = r.status === 401 ? 'Unauthorized (check email/password)' : 
                    r.status === 0 ? 'Network error - check CORS or API availability' : 
                    r.data?.message || pretty(r.data);
         toast(`Login failed: ${msg}`, 'error', 5000);
     }
    });
      
    tokenCopy?.addEventListener('click', async () => {
      if (!token) return;
      try {
        await navigator.clipboard.writeText(token);
        toast('Token copied', 'success');
      } catch {
        toast('Clipboard not permitted', 'error');
      }
    });
  
    btnListEmployees?.addEventListener('click', async () => {
      setBusy(btnListEmployees, true);
      const r = await api('/api/employees', { headers: { ...authHeader() } });
      setBusy(btnListEmployees, false);
      if (r.ok) {
        renderTo('employeesPlaceholder', 'employeesList', r.data);
        toast('Employees loaded');
      } else {
        hide(employeesList); show(employeesPlaceholder);
        toast(`Failed to load employees: ${pretty(r.data)}`, 'error', 4500);
      }
    });
  
    employeeForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      setBusy(btnCreateEmployee, true);
      const body = {
        name: $('#empName').value.trim(),
        position: $('#empPosition').value.trim(),
        salary: Number($('#empSalary').value),
        yearsOfExperience: Number($('#empYoE').value),
      };
      const r = await api('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body)
      });
      setBusy(btnCreateEmployee, false);
      if (r.ok) {
        toast('Employee created', 'success');
        btnListEmployees?.click();
      } else {
        toast(`Create employee failed: ${pretty(r.data)}`, 'error', 4500);
      }
    });
  
    btnTopExperience?.addEventListener('click', async () => {
      setBusy(btnTopExperience, true);
      const r = await api('/api/employees/top-experience', { headers: { ...authHeader() } });
      setBusy(btnTopExperience, false);
      if (r.ok) {
        renderTo('reportsPlaceholder', 'reportsOut', r.data);
      } else {
        hide(reportsOut); show(reportsPlaceholder);
        toast(`Top experience failed: ${pretty(r.data)}`, 'error', 4500);
      }
    });
  
    btnLowExpEngineers?.addEventListener('click', async () => {
      setBusy(btnLowExpEngineers, true);
      const r = await api('/api/employees/engineers/low-experience', { headers: { ...authHeader() } });
      setBusy(btnLowExpEngineers, false);
      if (r.ok) {
        renderTo('reportsPlaceholder', 'reportsOut', r.data);
      } else {
        hide(reportsOut); show(reportsPlaceholder);
        toast(`Low experience failed: ${pretty(r.data)}`, 'error', 4500);
      }
    });
  
    btnSalaryByYear?.addEventListener('click', async () => {
      setBusy(btnSalaryByYear, true);
      const year = (reportYearInput.value || '2024').trim();
      const r = await api(`/api/employees/salary/year/${encodeURIComponent(year)}`, {
        headers: { ...authHeader() }
      });
      setBusy(btnSalaryByYear, false);
      if (r.ok) {
        renderTo('reportsPlaceholder', 'reportsOut', r.data);
      } else {
        hide(reportsOut); show(reportsPlaceholder);
        toast(`Salary by year failed: ${pretty(r.data)}`, 'error', 4500);
      }
    });
  
    btnStorageHealth?.addEventListener('click', async () => {
      setBusy(btnStorageHealth, true);
      const r = await api('/api/files/storage/health', { headers: { ...authHeader() } });
      setBusy(btnStorageHealth, false);
      if (r.ok) {
        const data = r.data.data || r.data;
        renderTo('storagePlaceholder', 'storageOut', data);
        if (data.status === 'unhealthy') {
          toast(`Storage issue: ${data.error}`, 'error', 5000);
        }
      } else {
        hide(storageOut); show(storagePlaceholder);
        toast(`Storage health failed: ${pretty(r.data)}`, 'error', 4500);
      }
    });
    
    btnCronSetup?.addEventListener('click', async () => {
      setBusy(btnCronSetup, true);
      const a = await api('/api/cron/functions', { method: 'POST', headers: { ...authHeader() } });
      const b = await api('/api/cron/setup', { method: 'POST', headers: { ...authHeader() } });
      setBusy(btnCronSetup, false);
      if (a.ok || b.ok) {
        renderTo('cronPlaceholder', 'cronOut', { functions: a, setup: b });
        toast('Cron setup invoked');
      } else {
        hide(cronOut); show(cronPlaceholder);
        toast('Cron setup failed', 'error');
      }
    });
  
    btnCronJobs?.addEventListener('click', async () => {
      setBusy(btnCronJobs, true);
      const r = await api('/api/cron/jobs', { headers: { ...authHeader() } });
      setBusy(btnCronJobs, false);
      if (r.ok) {
        renderTo('cronPlaceholder', 'cronOut', r.data);
      } else {
        hide(cronOut); show(cronPlaceholder);
        const errorMsg = r.data?.message || pretty(r.data);
        toast(`Cron jobs failed: ${errorMsg}`, 'error', 4500);
        if (errorMsg.includes('Insufficient permissions')) {
          toast('Note: User needs ADMIN role with SYSTEM_MANAGE permission', 'error', 7000);
        }
      }
    });
  
    btnCronStatus?.addEventListener('click', async () => {
      setBusy(btnCronStatus, true);
      const r = await api('/api/cron/status', { headers: { ...authHeader() } });
      setBusy(btnCronStatus, false);
      if (r.ok) {
        renderTo('cronPlaceholder', 'cronOut', r.data);
      } else {
        hide(cronOut); show(cronPlaceholder);
        toast(`Cron status failed: ${pretty(r.data)}`, 'error', 4500);
      }
    });

    // Custom cron create
    btnCronCreate?.addEventListener('click', async () => {
      const body = {
        jobName: (cronJobName?.value || '').trim(),
        schedule: (cronSchedule?.value || '').trim(),
        command: (cronCommand?.value || '').trim()
      };
      if (!body.jobName || !body.schedule || !body.command) {
        toast('Please fill job name, schedule and command', 'error');
        return;
      }
      setBusy(btnCronCreate, true);
      const r = await api('/api/cron/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body)
      });
      setBusy(btnCronCreate, false);
      if (r.ok) {
        hide(cronCustomPlaceholder); show(cronCustomOut);
        cronCustomOut.textContent = pretty(r.data);
        toast('Custom cron created');
      } else {
        toast(`Create custom cron failed: ${pretty(r.data)}`, 'error');
      }
    });

    // Custom cron delete
    btnCronDelete?.addEventListener('click', async () => {
      const name = (cronJobName?.value || '').trim();
      if (!name) { toast('Provide job name', 'error'); return; }
      setBusy(btnCronDelete, true);
      const r = await api(`/api/cron/custom/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { ...authHeader() }
      });
      setBusy(btnCronDelete, false);
      if (r.ok) {
        hide(cronCustomPlaceholder); show(cronCustomOut);
        cronCustomOut.textContent = pretty(r.data);
        toast('Custom cron deleted');
      } else {
        toast(`Delete custom cron failed: ${pretty(r.data)}`, 'error');
      }
    });

    // Refresh all via custom panel
    btnCronRefreshAll2?.addEventListener('click', async () => {
      const jobs = await api('/api/cron/jobs', { headers: { ...authHeader() } });
      const status = await api('/api/cron/status', { headers: { ...authHeader() } });
      hide(cronCustomPlaceholder); show(cronCustomOut);
      cronCustomOut.textContent = pretty({ jobs: jobs.data, status: status.data });
    });

    // Export latest data_collections row to Supabase Storage
    btnCronExportLatest?.addEventListener('click', async () => {
      setBusy(btnCronExportLatest, true);
      const r = await api('/api/cron/export/latest', {
        method: 'POST',
        headers: { ...authHeader() }
      });
      setBusy(btnCronExportLatest, false);
      if (r.ok) {
        hide(cronCustomPlaceholder); show(cronCustomOut);
        cronCustomOut.textContent = pretty(r.data);
        toast('Exported latest to storage');
      } else {
        toast(`Export failed: ${pretty(r.data)}`, 'error');
      }
    });
  })();
  