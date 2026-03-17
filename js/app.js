/* ═══════════════════════════════════════════════════════
   DATA LAYER - LocalStorage
   ═══════════════════════════════════════════════════════ */
const DB = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem('ati_' + key)) || [];
    } catch {
      return [];
    }
  },
  set(key, data) {
    localStorage.setItem('ati_' + key, JSON.stringify(data));
  },
  getConfig(key, def) {
    try {
      return JSON.parse(localStorage.getItem('ati_cfg_' + key)) || def;
    } catch {
      return def;
    }
  },
  setConfig(key, val) {
    localStorage.setItem('ati_cfg_' + key, JSON.stringify(val));
  }
};

/* ═══════════════════════════════════════════════════════
   INITIALIZE SAMPLE DATA
   ═══════════════════════════════════════════════════════ */
function initSampleData() {
  if (DB.get('activos').length === 0) {
    const activos = [
      {
        id: 1, codigo: 'ATI-00001', tipo: 'LAPTOP', equipo: 'LAPTOP', marca: 'DELL',
        modelo: 'LATITUDE 5540', serie: 'SN1234567890', invEntel: 'INV10001',
        gama: 'GAMA A', estado: 'Disponible', estadoEquipo: 'NUEVO',
        disco: '512 GB', memoria: '16', ubicacion: 'Almacén San Borja',
        ubicacionAlmacen: 'GABINETE 1', fechaCompra: '2024-01-15',
        fechaIngreso: '2024-02-01', casoPedidoIngreso: 'PEDIDO 500001',
        origenEquipo: 'PROPIO', fechaSalida: '', casoPedidoSalida: '',
        destinoEquipo: '', responsableActivos: '', responsable: '',
        observaciones: '', valor: 4500
      },
      {
        id: 2, codigo: 'ATI-00002', tipo: 'MONITOR', equipo: 'MONITOR', marca: 'HP',
        modelo: 'E24 G5', serie: 'SN0987654321', invEntel: 'INV10002',
        gama: 'GAMA B', estado: 'Disponible', estadoEquipo: 'NUEVO',
        disco: '', memoria: '', ubicacion: 'Almacén San Borja',
        ubicacionAlmacen: 'ESTANTE A', fechaCompra: '2024-03-10',
        fechaIngreso: '2024-03-20', casoPedidoIngreso: 'PEDIDO 500002',
        origenEquipo: 'PROPIO', fechaSalida: '', casoPedidoSalida: '',
        destinoEquipo: '', responsableActivos: '', responsable: '',
        observaciones: '', valor: 1200
      }
    ];
    DB.set('activos', activos);
  }

  if (DB.get('colaboradores').length === 0) {
    const nombres = [
      'Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez',
      'Luis Rodríguez', 'Carmen Sánchez', 'Pedro Díaz', 'Laura Torres',
      'José Ramírez', 'Sofía Flores', 'Diego Vargas', 'Valentina Rojas',
      'Andrés Silva', 'Camila Morales', 'Fernando Castro'
    ];
    const areas = ['TI', 'Finanzas', 'RRHH', 'Operaciones', 'Comercial', 'Legal'];
    const cargos = ['Analista', 'Coordinador', 'Jefe', 'Gerente', 'Asistente', 'Especialista'];
    const perfiles = ['Empleado', 'Practicante', 'Externo', 'Intermediario'];
    const sedesColab = ['Sede Central', 'Sede San Isidro', 'Sede Miraflores', 'Sede San Borja', 'Sede La Molina'];
    const tiposPuesto = ['Presencial', 'Remoto', 'Híbrido'];
    const colabs = nombres.map((n, i) => ({
      id: i + 1,
      nombre: n,
      dni: String(10000000 + Math.floor(Math.random() * 89999999)),
      perfil: perfiles[Math.floor(Math.random() * perfiles.length)],
      area: areas[Math.floor(Math.random() * areas.length)],
      cargo: cargos[Math.floor(Math.random() * cargos.length)],
      ubicacion: sedesColab[Math.floor(Math.random() * sedesColab.length)],
      tipoPuesto: tiposPuesto[Math.floor(Math.random() * tiposPuesto.length)],
      telefono: '9' + String(10000000 + Math.floor(Math.random() * 89999999)),
      email: n.toLowerCase().replace(/ /g, '.').normalize("NFD").replace(/[\u0300-\u036f]/g, "") + '@empresa.com',
      estado: Math.random() > 0.15 ? 'Activo' : 'Cesado',
      fechaIngreso: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
    }));
    DB.set('colaboradores', colabs);
  }

  if (DB.get('asignaciones').length === 0) {
    const activos = DB.get('activos').filter(a => a.estado === 'Asignado');
    const colabs = DB.get('colaboradores').filter(c => c.estado === 'Activo');
    const asig = [];
    activos.forEach((a, i) => {
      if (colabs.length > 0) {
        const c = colabs[i % colabs.length];
        asig.push({
          id: i + 1,
          activoId: a.id,
          activoCodigo: a.codigo,
          activoTipo: a.tipo,
          activoMarca: a.marca,
          colaboradorId: c.id,
          colaboradorNombre: c.nombre,
          area: c.area,
          fechaAsignacion: a.fechaIngreso,
          estado: 'Vigente',
          observaciones: ''
        });
      }
    });
    DB.set('asignaciones', asig);
  }

  if (DB.get('movimientos').length === 0) DB.set('movimientos', []);
  if (DB.get('bajasPendientes').length === 0) DB.set('bajasPendientes', []);
  if (DB.get('historialBajas').length === 0) DB.set('historialBajas', []);

  // Verificar que los gestores tengan credenciales válidas; si no, reinicializar
  const _gestoresActuales = DB.get('gestores');
  const _adminOk = _gestoresActuales.some(g => (g.usuario || '').toLowerCase() === 'admin');
  if (_gestoresActuales.length === 0 || !_adminOk) {
    DB.set('gestores', [
      { id: 1, nombre: 'Gerardo R.', email: 'gerardo@empresa.com', rol: 'Administrador', perfil: 'Administrativo', usuario: 'admin', password: '', estado: 'Activo' },
      { id: 2, nombre: 'Admin TI', email: 'admin.ti@empresa.com', rol: 'Gestor', perfil: 'Administrativo', usuario: 'gestor', password: 'gestor123', estado: 'Activo' },
      { id: 3, nombre: 'Carlos Tiendas', email: 'carlos.tiendas@empresa.com', rol: 'Gestor', perfil: 'Tiendas', usuario: 'tiendas', password: 'tiendas123', estado: 'Activo' }
    ]);
  }

  if (DB.get('tiendas').length === 0) {
    const tiendasSample = [
      { id: 1, codigo: 'TDA-00001', nombre: 'Tienda San Borja', region: 'Lima', departamento: 'Lima', provincia: 'Lima', distrito: 'San Borja', direccion: 'Av. Javier Prado Este 1234', responsable: 'Juan Pérez', telefonoResponsable: '987654321', emailResponsable: 'juan.perez@empresa.com', tipoLocal: 'Tienda Propia', telefono: '01-2345678', estado: 'Activa', fechaApertura: '2022-03-15', observaciones: 'Tienda principal zona sur' },
      { id: 2, codigo: 'TDA-00002', nombre: 'Tienda Miraflores', region: 'Lima', departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores', direccion: 'Av. Larco 567', responsable: 'María García', telefonoResponsable: '987654322', emailResponsable: 'maria.garcia@empresa.com', tipoLocal: 'Tienda Propia', telefono: '01-3456789', estado: 'Activa', fechaApertura: '2021-08-20', observaciones: '' },
      { id: 3, codigo: 'TDA-00003', nombre: 'Tienda Plaza Norte', region: 'Lima', departamento: 'Lima', provincia: 'Lima', distrito: 'Independencia', direccion: 'CC Plaza Norte Local 215', responsable: 'Carlos López', telefonoResponsable: '987654323', emailResponsable: 'carlos.lopez@empresa.com', tipoLocal: 'Local en Centro Comercial', telefono: '01-4567890', estado: 'Activa', fechaApertura: '2023-01-10', observaciones: 'Ubicada en el 2do piso' },
      { id: 4, codigo: 'TDA-00004', nombre: 'Tienda Arequipa Centro', region: 'Sur', departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'Cercado', direccion: 'Calle Mercaderes 312', responsable: 'Ana Martínez', telefonoResponsable: '987654324', emailResponsable: 'ana.martinez@empresa.com', tipoLocal: 'Tienda Propia', telefono: '054-234567', estado: 'Activa', fechaApertura: '2022-06-01', observaciones: '' },
      { id: 5, codigo: 'TDA-00005', nombre: 'Tienda Trujillo Mall', region: 'Norte', departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Trujillo', direccion: 'CC Mall Aventura Local 108', responsable: 'Luis Rodríguez', telefonoResponsable: '987654325', emailResponsable: 'luis.rodriguez@empresa.com', tipoLocal: 'Local en Centro Comercial', telefono: '044-345678', estado: 'Activa', fechaApertura: '2023-05-20', observaciones: '' },
      { id: 6, codigo: 'TDA-00006', nombre: 'Punto de Venta Cusco', region: 'Sur', departamento: 'Cusco', provincia: 'Cusco', distrito: 'Cusco', direccion: 'Av. El Sol 890', responsable: 'Carmen Sánchez', telefonoResponsable: '987654326', emailResponsable: 'carmen.sanchez@empresa.com', tipoLocal: 'Punto de Venta', telefono: '084-456789', estado: 'Inactiva', fechaApertura: '2021-11-15', observaciones: 'Temporalmente cerrada por remodelación' },
      { id: 7, codigo: 'TDA-00007', nombre: 'Tienda Piura Open Plaza', region: 'Norte', departamento: 'Piura', provincia: 'Piura', distrito: 'Piura', direccion: 'CC Open Plaza Local 305', responsable: 'Pedro Díaz', telefonoResponsable: '987654327', emailResponsable: 'pedro.diaz@empresa.com', tipoLocal: 'Local en Centro Comercial', telefono: '073-567890', estado: 'Activa', fechaApertura: '2023-09-01', observaciones: '' },
      { id: 8, codigo: 'TDA-00008', nombre: 'Almacén Central Lima', region: 'Lima', departamento: 'Lima', provincia: 'Lima', distrito: 'La Victoria', direccion: 'Jr. Gamarra 456 Int. 201', responsable: 'Laura Torres', telefonoResponsable: '987654328', emailResponsable: 'laura.torres@empresa.com', tipoLocal: 'Almacén', telefono: '01-5678901', estado: 'Activa', fechaApertura: '2020-01-15', observaciones: 'Almacén principal de distribución' }
    ];
    DB.set('tiendas', tiendasSample);
  }

  // Default config params
  if (!DB.getConfig('tipos', null))
    DB.setConfig('tipos', ['LAPTOP', 'DESKTOP', 'MONITOR', 'IMPRESORA', 'SERVIDOR', 'SWITCH', 'ACCESS POINT', 'TABLET', 'TELÉFONO IP']);
  if (!DB.getConfig('marcas', null))
    DB.setConfig('marcas', ['DELL', 'HP', 'LENOVO', 'APPLE', 'SAMSUNG', 'CISCO', 'ASUS', 'ACER', 'MICROSOFT']);
  if (!DB.getConfig('estados', null))
    DB.setConfig('estados', ['Disponible', 'Asignado', 'En Mantenimiento', 'Dado de Baja']);
  if (!DB.getConfig('ubicaciones', null))
    DB.setConfig('ubicaciones', ['ALMACÉN SAN BORJA', 'ALMACÉN NORTE', 'ALMACÉN SUR', 'ALMACÉN CENTRAL', 'DATA CENTER', 'ALMACEN TI PR']);
  if (!DB.getConfig('areas', null))
    DB.setConfig('areas', ['TI', 'FINANZAS', 'RRHH', 'OPERACIONES', 'COMERCIAL', 'LEGAL']);
  if (!DB.getConfig('gamas', null))
    DB.setConfig('gamas', ['GAMA A', 'GAMA B', 'GAMA C', 'GAMA D']);
  if (!DB.getConfig('estadosEquipo', null))
    DB.setConfig('estadosEquipo', ['NUEVO', 'BUENO', 'REGULAR', 'MALO', 'OBSOLETO']);
  if (!DB.getConfig('origenes', null))
    DB.setConfig('origenes', ['PROPIO', 'ALQUILADO', 'TERCERO']);
  if (!DB.getConfig('tipoDocumento', null))
    DB.setConfig('tipoDocumento', ['PEDIDO', 'ORDEN DE COMPRA', 'GUÍA DE REMISIÓN', 'FACTURA', 'NOTA DE INGRESO']);
  if (!DB.getConfig('sistemasOS', null))
    DB.setConfig('sistemasOS', ['WIN 10', 'WIN 11', 'WIN 7', 'LINUX', 'MAC OS', 'ANDROID', 'IOS', 'CHROME OS', 'SIN SO']);
  if (!DB.getConfig('opcionesRAM', null))
    DB.setConfig('opcionesRAM', ['2 GB', '4 GB', '8 GB', '16 GB', '32 GB', '64 GB']);
  if (!DB.getConfig('opcionesAlmacenamiento', null))
    DB.setConfig('opcionesAlmacenamiento', ['128 GB', '256 GB', '500 GB', '512 GB', '1 TB', '2 TB']);
  if (!DB.getConfig('regiones', null))
    DB.setConfig('regiones', ['LIMA', 'NORTE', 'SUR', 'CENTRO', 'ORIENTE']);
  if (!DB.getConfig('departamentos', null))
    DB.setConfig('departamentos', ['LIMA', 'AREQUIPA', 'LA LIBERTAD', 'CUSCO', 'PIURA', 'LAMBAYEQUE', 'JUNÍN', 'LORETO', 'CAJAMARCA', 'PUNO', 'ICA', 'ANCASH', 'TACNA', 'HUÁNUCO', 'SAN MARTÍN']);
  if (!DB.getConfig('tiposLocal', null))
    DB.setConfig('tiposLocal', ['TIENDA PROPIA', 'LOCAL EN CENTRO COMERCIAL', 'PUNTO DE VENTA', 'FRANQUICIA', 'ALMACÉN', 'OFICINA', 'KIOSCO', 'STAND']);
  if (!DB.getConfig('sedesAdmin', null))
    DB.setConfig('sedesAdmin', ['SEDE CENTRAL', 'SEDE SAN ISIDRO', 'SEDE MIRAFLORES', 'SEDE SAN BORJA', 'SEDE LA MOLINA']);
  if (!DB.getConfig('tipoPuesto', null))
    DB.setConfig('tipoPuesto', ['PRESENCIAL', 'REMOTO', 'HÍBRIDO']);
  if (!DB.getConfig('tipoAsignacion', null))
    DB.setConfig('tipoAsignacion', ['INGRESO NUEVO', 'ASIGNACIÓN', 'REEMPLAZO', 'RENOVACIÓN', 'PRÉSTAMO', 'REPOSICIÓN DAÑO FÍSICO', 'REPOSICIÓN ROBO']);
  if (!DB.getConfig('tipoEquipos', null))
    DB.setConfig('tipoEquipos', {
      'LAPTOP':       ['LAPTOP', 'LAPTOP MINI', 'LAPTOP GAMER'],
      'DESKTOP':      ['PC ESCRITORIO', 'PC TORRE', 'ALL-IN-ONE'],
      'MONITOR':      ['MONITOR 22"', 'MONITOR 24"', 'MONITOR 27"'],
      'IMPRESORA':    ['IMPRESORA LASER', 'IMPRESORA INKJET', 'IMPRESORA MULTIFUNCIONAL'],
      'SERVIDOR':     ['SERVIDOR TOWER', 'SERVIDOR RACK', 'SERVIDOR BLADE'],
      'SWITCH':       ['SWITCH 8P', 'SWITCH 24P', 'SWITCH 48P'],
      'ACCESS POINT': ['AP INTERIOR', 'AP EXTERIOR'],
      'TABLET':       ['TABLET ANDROID', 'TABLET IOS'],
      'TELÉFONO IP':  ['TELÉFONO IP BÁSICO', 'TELÉFONO IP AVANZADO']
    });

  // ── Migración: normalizar catálogos existentes a UPPERCASE ──
  _migrateConfigToUpper();
}

function _migrateConfigToUpper() {
  // Normalizar arrays de catálogos a UPPERCASE (excepto estados que usan Title Case)
  const arrKeys = ['tipos','marcas','ubicaciones','areas','gamas','estadosEquipo','origenes',
    'tipoDocumento','sistemasOS','regiones','departamentos','tiposLocal','sedesAdmin','tipoPuesto','tipoAsignacion'];
  arrKeys.forEach(key => {
    const val = DB.getConfig(key, null);
    if (Array.isArray(val)) {
      const upper = [...new Set(val.map(v => typeof v === 'string' ? v.toUpperCase().trim() : v))];
      DB.setConfig(key, upper);
    }
  });
  // Normalizar tipoEquipos (object con keys y arrays)
  const te = DB.getConfig('tipoEquipos', null);
  if (te && typeof te === 'object') {
    const newTe = {};
    Object.keys(te).forEach(k => {
      const newKey = k.toUpperCase().trim();
      const arr = Array.isArray(te[k]) ? te[k].map(v => typeof v === 'string' ? v.toUpperCase().trim() : v) : te[k];
      newTe[newKey] = arr;
    });
    DB.setConfig('tipoEquipos', newTe);
  }
  // Normalizar activos existentes: tipo, marca, equipo, modelo a UPPERCASE (NO el estado)
  const activos = DB.get('activos');
  let changed = false;
  activos.forEach(a => {
    if (a.tipo && a.tipo !== a.tipo.toUpperCase().trim()) { a.tipo = a.tipo.toUpperCase().trim(); changed = true; }
    if (a.marca && a.marca !== a.marca.toUpperCase().trim()) { a.marca = a.marca.toUpperCase().trim(); changed = true; }
    if (a.equipo && a.equipo !== a.equipo.toUpperCase().trim()) { a.equipo = a.equipo.toUpperCase().trim(); changed = true; }
    if (a.modelo && a.modelo !== a.modelo.toUpperCase().trim()) { a.modelo = a.modelo.toUpperCase().trim(); changed = true; }
  });
  if (changed) DB.set('activos', activos);

  // Corregir asignaciones con estado en UPPERCASE (bug de upperFields)
  const asignaciones = DB.get('asignaciones');
  let asigChanged = false;
  const estadoMap = { 'VIGENTE': 'Vigente', 'DEVUELTO': 'Devuelto' };
  asignaciones.forEach(a => {
    if (a.estado && estadoMap[a.estado]) {
      a.estado = estadoMap[a.estado];
      asigChanged = true;
    }
  });
  if (asigChanged) DB.set('asignaciones', asignaciones);

  // Corregir colaboradores con estado en UPPERCASE
  const colabs = DB.get('colaboradores');
  let colabChanged = false;
  const colabEstadoMap = { 'ACTIVO': 'Activo', 'CESADO': 'Cesado' };
  colabs.forEach(c => {
    if (c.estado && colabEstadoMap[c.estado]) {
      c.estado = colabEstadoMap[c.estado];
      colabChanged = true;
    }
  });
  if (colabChanged) DB.set('colaboradores', colabs);

  // Corregir gestores con estado en UPPERCASE
  const gestores = DB.get('gestores');
  let gestorChanged = false;
  gestores.forEach(g => {
    if (g.estado && g.estado === 'ACTIVO') {
      g.estado = 'Activo';
      gestorChanged = true;
    }
  });
  if (gestorChanged) DB.set('gestores', gestores);
}

initSampleData();

/* ═══════════════════════════════════════════════════════
   AUTHENTICATION / LOGIN
   ═══════════════════════════════════════════════════════ */
let currentUser = null;

function doLogin() {
  const userInput = document.getElementById('loginUser').value.trim();
  const passInput = document.getElementById('loginPass').value;
  const errorEl   = document.getElementById('loginError');

  if (!userInput) {
    errorEl.textContent = 'Ingrese el usuario';
    errorEl.style.display = 'block';
    return;
  }

  const gestores = DB.get('gestores');
  const gestor = gestores.find(g =>
    (g.usuario || '').toLowerCase() === userInput.toLowerCase() &&
    (g.password || '').toLowerCase() === (passInput || '').toLowerCase() &&
    (g.estado || '').toLowerCase() === 'activo'
  );

  if (!gestor) {
    errorEl.textContent = 'Usuario o contraseña incorrectos, o cuenta inactiva';
    errorEl.style.display = 'block';
    document.getElementById('loginPass').value = '';
    return;
  }

  currentUser = gestor;
  localStorage.setItem('ati_session', JSON.stringify({ id: gestor.id, usuario: gestor.usuario }));

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appWrapper').style.display = 'flex';

  updateSidebarUser();
  buildSidebar();
  updateBreadcrumb();
  renderPage();
}

function doLogout() {
  if (!confirm('¿Desea cerrar sesión?')) return;
  currentUser = null;
  localStorage.removeItem('ati_session');

  document.getElementById('appWrapper').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').style.display = 'none';

  currentSection = 'dashboards';
  currentPage = 'dashboard1';
}

function checkSession() {
  const session = localStorage.getItem('ati_session');
  if (session) {
    try {
      const data = JSON.parse(session);
      const gestores = DB.get('gestores');
      const gestor = gestores.find(g => g.id === data.id && g.usuario === data.usuario && g.estado === 'Activo');
      if (gestor) {
        currentUser = gestor;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appWrapper').style.display = 'flex';
        updateSidebarUser();
        return true;
      }
    } catch { /* invalid session */ }
  }
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appWrapper').style.display = 'none';
  return false;
}

function updateSidebarUser() {
  if (!currentUser) return;
  const initials = currentUser.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const avatarEl = document.getElementById('sidebarAvatar');
  const nameEl   = document.getElementById('sidebarUserName');
  const roleEl   = document.getElementById('sidebarUserRole');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent = currentUser.nombre;
  if (roleEl)   roleEl.textContent = currentUser.rol + ' · ' + currentUser.perfil;
}

/* ═══════════════════════════════════════════════════════
   NAVIGATION DEFINITION
   ═══════════════════════════════════════════════════════ */
const NAV = [
  {
    key: 'dashboards', label: 'Dashboards', icon: '📊',
    items: [
      { key: 'dashboard1', label: 'Dashboard General' },
      { key: 'dashboard2', label: 'Dashboard Asignaciones' },
      { key: 'dashboard3', label: 'Dashboard Financiero' }
    ]
  },
  {
    key: 'activos', label: 'Activos TI', icon: '💻',
    items: [{ key: 'ingreso', label: 'Registro Activo' }]
  },
  {
    key: 'colaboradores', label: 'Colaboradores', icon: '👥',
    items: [
      { key: 'padron', label: 'Padrón' },
      { key: 'ceses', label: 'Ceses' }
    ]
  },
  {
    key: 'asignaciones', label: 'Asignación', icon: '🔗',
    items: [
      { key: 'asignacion', label: 'Asignación de Activos' }
    ]
  },
  {
    key: 'tiendas', label: 'Tiendas', icon: '🏪',
    items: [
      { key: 'listaTiendas', label: 'Gestión de Tiendas' }
    ]
  },
  {
    key: 'cmdb', label: 'CMDB', icon: '🗄️',
    items: [{ key: 'inventario', label: 'Inventario' }]
  },
  {
    key: 'bitacora', label: 'Bitácora', icon: '📋',
    items: [
      { key: 'movimientos', label: 'Movimientos' },
      { key: 'pendientesRetorno', label: 'Pendientes Retorno' }
    ]
  },
  {
    key: 'bajas', label: 'Bajas', icon: '🗑️',
    items: [
      { key: 'bajasPendientes', label: 'Bajas Pendientes' },
      { key: 'historialBajas', label: 'Historial de Bajas' }
    ]
  },
  {
    key: 'configuracion', label: 'Configuración', icon: '⚙️',
    items: [
      { key: 'gestores', label: 'Gestores' },
      { key: 'parametros', label: 'Parámetros' }
    ]
  }
];

let currentSection = 'dashboards';
let currentPage = 'dashboard1';

/* ═══════════════════════════════════════════════════════
   SIDEBAR BUILD & NAVIGATION
   ═══════════════════════════════════════════════════════ */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main = document.querySelector('.main');
  const isCollapsed = sidebar.classList.toggle('collapsed');
  main.classList.toggle('expanded', isCollapsed);
  document.body.classList.toggle('sidebar-collapsed', isCollapsed);
  localStorage.setItem('ati_sidebarCollapsed', isCollapsed);
}

function restoreSidebarState() {
  if (localStorage.getItem('ati_sidebarCollapsed') === 'true') {
    document.getElementById('sidebar').classList.add('collapsed');
    document.querySelector('.main').classList.add('expanded');
    document.body.classList.add('sidebar-collapsed');
  }
}

/* ── Módulos restringidos por perfil ──
   Administrador  → ve TODO
   Gestor Tiendas → ve todo EXCEPTO Colaboradores
   Gestor Administrativo → ve todo EXCEPTO Tiendas
   Gestores (config) → solo visible para rol Administrador
*/
const HIDDEN_SECTIONS = {
  'Tiendas':        ['colaboradores'],
  'Administrativo': ['tiendas']
};

function getFilteredNav() {
  if (!currentUser) return NAV;
  const isAdmin   = currentUser.rol === 'Administrador';
  const perfil    = currentUser.perfil;
  const hiddenSec = isAdmin ? [] : (HIDDEN_SECTIONS[perfil] || []);

  return NAV.map(section => {
    // Ocultar secciones completas según perfil
    if (hiddenSec.includes(section.key)) return null;

    // En Configuración: ocultar "Gestores" a no-administradores
    if (!isAdmin && section.key === 'configuracion') {
      const items = section.items.filter(i => i.key !== 'gestores');
      return items.length ? { ...section, items } : null;
    }

    return section;
  }).filter(Boolean);
}

function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  const filteredNav = getFilteredNav();
  nav.innerHTML = filteredNav.map(section => `
    <div class="nav-section" data-section="${section.key}">
      <div class="nav-section-header ${section.key === currentSection ? 'active expanded' : ''}"
           onclick="toggleSection('${section.key}')">
        <span class="nav-icon">${section.icon}</span>
        <span>${section.label}</span>
        <span class="chevron">▸</span>
      </div>
      <div class="nav-section-items ${section.key === currentSection ? 'show' : ''}">
        ${section.items.map(item => `
          <div class="nav-item ${item.key === currentPage ? 'active' : ''}"
               onclick="navigateTo('${section.key}','${item.key}')">
            ${item.label}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function toggleSection(key) {
  const section = document.querySelector(`.nav-section[data-section="${key}"]`);
  const header = section.querySelector('.nav-section-header');
  const items = section.querySelector('.nav-section-items');
  header.classList.toggle('expanded');
  items.classList.toggle('show');
}

function navigateTo(section, page) {
  // Protección: redirigir si intenta acceder a módulo restringido
  if (currentUser) {
    const isAdmin   = currentUser.rol === 'Administrador';
    const hiddenSec = isAdmin ? [] : (HIDDEN_SECTIONS[currentUser.perfil] || []);
    if (hiddenSec.includes(section)) { section = 'dashboards'; page = 'dashboard1'; }
    if (!isAdmin && page === 'gestores')  { section = 'dashboards'; page = 'dashboard1'; }
  }
  currentSection = section;
  currentPage = page;
  buildSidebar();
  updateBreadcrumb();
  renderPage();
}

function updateBreadcrumb() {
  const section = NAV.find(n => n.key === currentSection);
  const page = section?.items.find(i => i.key === currentPage);
  document.getElementById('breadcrumb').innerHTML = `
    <span>${section?.label || ''}</span>
    <span class="separator">›</span>
    <span class="current">${page?.label || ''}</span>
  `;
}

/* ═══════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ═══════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════ */
function openModal(title, bodyHTML, footerHTML, extraClass = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  document.getElementById('modal').className = 'modal' + (extraClass ? ' ' + extraClass : '');
  document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.getElementById('modal').className = 'modal';
  // Limpiar estado del modal de asignación al cerrar por cualquier vía
  _asigSelectedColab = null;
  _asigSelectedActivos = [];
  _asigSelectedAccesorios = [];
  _asigReemOld = null;
  _asigStockSearch = '';
  _asigStockTipo = 'Todos';
  _asigStockAlmacen = 'Todos';
  _asigStockPage = 0;
  _asigAccSearch = '';
  _asigAccTipo = 'Todos';
  _asigAccPage = 0;
  _asigFecha = '';
  _asigTicket = '';
  _asigObs = '';
  _asigMotivo = '';
  _asigFechaPrestamo = '';
}

/* ═══════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════ */
function nextId(arr) {
  return arr.length ? Math.max(...arr.map(a => a.id)) + 1 : 1;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// Normaliza cualquier valor de fecha a formato interno yyyy-mm-dd
function normalizeDate(val) {
  if (!val) return '';
  // Si es Date object (de XLSX con cellDates)
  if (val instanceof Date) {
    const dd = String(val.getDate()).padStart(2, '0');
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    return val.getFullYear() + '-' + mm + '-' + dd;
  }
  const s = String(val).trim();
  if (!s) return '';
  // Si es número (serial de Excel: días desde 1/1/1900)
  if (/^\d{4,6}$/.test(s)) {
    const d = new Date(Math.round((parseInt(s) - 25569) * 86400 * 1000));
    if (!isNaN(d)) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return d.getFullYear() + '-' + mm + '-' + dd;
    }
  }
  // dd/mm/yyyy o dd-mm-yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return dmy[3] + '-' + dmy[2].padStart(2, '0') + '-' + dmy[1].padStart(2, '0');
  // yyyy-mm-dd (ya está en formato interno)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // yyyy/mm/dd
  const ymd = s.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (ymd) return ymd[1] + '-' + ymd[2].padStart(2, '0') + '-' + ymd[3].padStart(2, '0');
  return s;
}

function formatDate(d) {
  if (!d) return '—';
  const s = String(d);
  // Serial de Excel (número de 4-6 dígitos)
  if (/^\d{4,6}$/.test(s)) {
    const dt = new Date(Math.round((parseInt(s) - 25569) * 86400 * 1000));
    if (!isNaN(dt)) {
      return String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0') + '/' + dt.getFullYear();
    }
  }
  // Soportar formato interno yyyy-mm-dd (con o sin hora T...)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  // Si ya está en dd/mm/yyyy retornarlo tal cual
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
  return s;
}

function formatDateTime(d) {
  if (!d) return '—';
  if (d.includes('T') || d.includes(' ')) {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2, '0');
    const mi = String(dt.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  }
  return formatDate(d);
}

function esc(s) {
  return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Convierte todos los valores string de un objeto a MAYÚSCULAS (excepto campos de fecha, email y password)
const _SKIP_UPPER = ['email','password','usuario','correoColab','fechaIngreso','fechaCompra','fechaAsignacion','fechaCese','fechaApertura','adendaFechaInicio','adendaFechaFin','fecha','fechaAprobacion','estado'];
function upperFields(obj) {
  const result = {};
  for (const k in obj) {
    const v = obj[k];
    if (typeof v === 'string' && !_SKIP_UPPER.includes(k) && !k.startsWith('_')) {
      result[k] = v.toUpperCase();
    } else {
      result[k] = v;
    }
  }
  return result;
}

function optionsHTML(arr, selected) {
  return arr.map(v => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join('');
}

function addMovimiento(tipo, detalle) {
  const movs = DB.get('movimientos');
  movs.unshift({
    id: nextId(movs),
    tipo,
    detalle,
    fecha: today(),
    hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    usuario: currentUser ? currentUser.nombre : 'Sistema'
  });
  DB.set('movimientos', movs);
}

/* ═══════════════════════════════════════════════════════
   PAGINATION
   ═══════════════════════════════════════════════════════ */
const PAGE_SIZE = 10;
const pageState = {};

function resetPage(key) { pageState[key] = 1; }
function goPage(key, p) {
  pageState[key] = p;
  if (key === 'ingreso' && document.getElementById('ingresoTableWrap')) {
    _renderIngresoTable();
  } else if (key === 'padron' && document.getElementById('padronTableWrap')) {
    _renderPadronTable();
  } else if (key === 'ceses' && document.getElementById('cesTableWrap')) {
    _renderCesTable();
  } else if (key === 'inventario' && document.getElementById('invTableWrap')) {
    _renderInvTable();
  } else if (key === 'asignacion' && document.getElementById('asigTableWrap')) {
    _renderAsigTable();
  } else if (key === 'bitacora' && document.getElementById('bitTableWrap')) {
    _renderBitTable();
  } else {
    renderPage();
  }
}

function pagSlice(data, key) {
  const p = pageState[key] || 1;
  return data.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
}

function pagFooter(key, total) {
  const p = pageState[key] || 1;
  const tp = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const s = total === 0 ? 0 : (p - 1) * PAGE_SIZE + 1;
  const e = Math.min(p * PAGE_SIZE, total);

  const nums = [];
  if (tp <= 7) {
    for (let i = 1; i <= tp; i++) nums.push(i);
  } else {
    nums.push(1);
    if (p > 3) nums.push('…');
    for (let i = Math.max(2, p - 1); i <= Math.min(tp - 1, p + 1); i++) nums.push(i);
    if (p < tp - 2) nums.push('…');
    nums.push(tp);
  }

  const pagHTML = tp > 1 ? `
    <div class="pagination">
      <button ${p === 1 ? 'disabled' : ''} onclick="goPage('${key}',${p - 1})">‹</button>
      ${nums.map(n => n === '…'
        ? `<span style="display:flex;align-items:center;justify-content:center;width:20px;color:var(--text-muted)">…</span>`
        : `<button class="${n === p ? 'active' : ''}" onclick="goPage('${key}',${n})">${n}</button>`
      ).join('')}
      <button ${p === tp ? 'disabled' : ''} onclick="goPage('${key}',${p + 1})">›</button>
    </div>` : '';

  return `<span>Mostrando ${s}–${e} de ${total} · Pág. ${p}/${tp}</span>${pagHTML}`;
}

/* ═══════════════════════════════════════════════════════
   CHART HELPERS
   ═══════════════════════════════════════════════════════ */
function drawDonut(chartId, legendId, data, colorMap) {
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return;

  const r = 70, cx = 90, cy = 90, sw = 22;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const paths = entries.map(([label, val]) => {
    const pct = val / total;
    const dash = circumference * pct;
    const gap = circumference - dash;
    const color = colorMap[label] || '#94a3b8';
    const svg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}"
      stroke-width="${sw}" stroke-dasharray="${dash} ${gap}"
      stroke-dashoffset="${-offset}" stroke-linecap="round"
      style="transition: all 0.6s ease"/>`;
    offset += dash;
    return svg;
  }).join('');

  document.getElementById(chartId).innerHTML = `
    <svg viewBox="0 0 180 180">${paths}</svg>
    <div class="center-text">
      <div class="center-value">${total}</div>
      <div class="center-label">Total</div>
    </div>
  `;

  document.getElementById(legendId).innerHTML = entries.map(([label, val]) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colorMap[label] || '#94a3b8'}"></div>
      ${esc(label)} (${val})
    </div>
  `).join('');
}

function drawBars(chartId, data) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  document.getElementById(chartId).innerHTML = entries.map(([label, val], i) => `
    <div class="bar-item">
      <div class="bar-value">${val}</div>
      <div class="bar" style="height:${(val / max) * 100}%;background:${colors[i % colors.length]}"></div>
      <div class="bar-label">${esc(label)}</div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════
   PAGE ROUTER
   ═══════════════════════════════════════════════════════ */
function renderPage() {
  const area = document.getElementById('contentArea');
  const pages = {
    dashboard1: renderDashboard1,
    dashboard2: renderDashboard2,
    dashboard3: renderDashboard3,
    ingreso: renderIngreso,
    padron: renderPadron,
    asignacion: renderAsignacion,
    ceses: renderCeses,
    listaTiendas: renderTiendas,
    inventario: renderInventario,
    movimientos: renderMovimientos,
    pendientesRetorno: renderPendientesRetorno,
    bajasPendientes: renderBajasPendientes,
    historialBajas: renderHistorialBajas,
    gestores: renderGestores,
    parametros: renderParametros
  };
  (pages[currentPage] || renderDashboard1)(area);
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD 1 - General
   ═══════════════════════════════════════════════════════ */
function renderDashboard1(el) {
  const activos = DB.get('activos');
  const colabs = DB.get('colaboradores');
  const movs = DB.get('movimientos');

  const byEstado = {};
  activos.forEach(a => { byEstado[a.estado] = (byEstado[a.estado] || 0) + 1; });
  const byTipo = {};
  activos.forEach(a => { byTipo[a.tipo] = (byTipo[a.tipo] || 0) + 1; });

  const estadoColors = {
    'Disponible': '#10b981',
    'Asignado': '#3b82f6',
    'En Mantenimiento': '#f59e0b',
    'Dado de Baja': '#ef4444'
  };

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard General</h1>
        <div class="subtitle">Vista general del estado de los activos TI</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon blue">💻</div>
          <span class="stat-trend up">Activos</span>
        </div>
        <div class="stat-value">${activos.length}</div>
        <div class="stat-label">Total de activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">✅</div></div>
        <div class="stat-value">${byEstado['Disponible'] || 0}</div>
        <div class="stat-label">Disponibles</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon purple">👤</div></div>
        <div class="stat-value">${byEstado['Asignado'] || 0}</div>
        <div class="stat-label">Asignados</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon orange">🔧</div></div>
        <div class="stat-value">${byEstado['En Mantenimiento'] || 0}</div>
        <div class="stat-label">En mantenimiento</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon red">👥</div></div>
        <div class="stat-value">${colabs.filter(c => c.estado === 'Activo').length}</div>
        <div class="stat-label">Colaboradores activos</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-container">
        <div class="chart-title">Estado de Activos</div>
        <div class="donut-chart" id="donutChart"></div>
        <div class="chart-legend" id="donutLegend"></div>
      </div>
      <div class="chart-container">
        <div class="chart-title">Activos por Tipo</div>
        <div class="bar-chart" id="barChart"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Últimos Movimientos</h3></div>
      <div class="card-body">
        ${movs.length === 0
          ? '<div class="empty-state"><p>No hay movimientos registrados aún.</p></div>'
          : `<div class="activity-list">
              ${movs.slice(0, 8).map(m => `
                <div class="activity-item">
                  <div class="activity-dot" style="background:${
                    m.tipo === 'Ingreso' ? 'var(--success)' :
                    m.tipo === 'Baja' || m.tipo === 'Eliminación' ? 'var(--danger)' :
                    m.tipo === 'Asignación' ? 'var(--info)' : 'var(--warning)'
                  }"></div>
                  <div class="activity-content">
                    <div class="activity-text"><strong>${esc(m.tipo)}</strong> — ${esc(m.detalle)}</div>
                    <div class="activity-time">${formatDate(m.fecha)} ${m.hora || ''} · ${esc(m.usuario)}</div>
                  </div>
                </div>
              `).join('')}
            </div>`
        }
      </div>
    </div>
  `;

  drawDonut('donutChart', 'donutLegend', byEstado, estadoColors);
  drawBars('barChart', byTipo);
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD 2 - Asignaciones
   ═══════════════════════════════════════════════════════ */
function renderDashboard2(el) {
  const asig = DB.get('asignaciones');

  const byArea = {};
  asig.forEach(a => { byArea[a.area] = (byArea[a.area] || 0) + 1; });

  const byColab = {};
  asig.filter(a => a.estado === 'Vigente').forEach(a => {
    byColab[a.colaboradorNombre] = (byColab[a.colaboradorNombre] || 0) + 1;
  });

  const topColab = Object.entries(byColab).sort((a, b) => b[1] - a[1]).slice(0, 10);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard de Asignaciones</h1>
        <div class="subtitle">Distribución de activos por colaborador y área</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon blue">📎</div></div>
        <div class="stat-value">${asig.length}</div>
        <div class="stat-label">Total asignaciones</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">✅</div></div>
        <div class="stat-value">${asig.filter(a => a.estado === 'Vigente').length}</div>
        <div class="stat-label">Vigentes</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon purple">👥</div></div>
        <div class="stat-value">${Object.keys(byColab).length}</div>
        <div class="stat-label">Colaboradores con activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon orange">🏢</div></div>
        <div class="stat-value">${Object.keys(byArea).length}</div>
        <div class="stat-label">Áreas con activos</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-container">
        <div class="chart-title">Asignaciones por Área</div>
        <div class="bar-chart" id="barAreaChart"></div>
      </div>
      <div class="chart-container">
        <div class="chart-title">Top Colaboradores con más Activos</div>
        <div style="padding:8px 0">
          ${topColab.length === 0
            ? '<div class="empty-state"><p>Sin datos</p></div>'
            : topColab.map(([name, count], i) => `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                  <span style="font-size:12px;color:var(--text-muted);width:20px">${i + 1}</span>
                  <div style="flex:1">
                    <div style="font-size:13px;font-weight:500;margin-bottom:4px">${esc(name)}</div>
                    <div style="height:6px;background:var(--bg);border-radius:3px;overflow:hidden">
                      <div style="height:100%;width:${(count / Math.max(...topColab.map(t => t[1]))) * 100}%;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:3px"></div>
                    </div>
                  </div>
                  <span style="font-size:13px;font-weight:600;color:var(--text)">${count}</span>
                </div>
              `).join('')
          }
        </div>
      </div>
    </div>
  `;

  drawBars('barAreaChart', byArea);
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD 3 - Financiero
   ═══════════════════════════════════════════════════════ */
function renderDashboard3(el) {
  const activos = DB.get('activos');
  const totalValor = activos.reduce((s, a) => s + (a.valor || 0), 0);

  const byTipoValor = {};
  activos.forEach(a => { byTipoValor[a.tipo] = (byTipoValor[a.tipo] || 0) + (a.valor || 0); });

  const byUbicValor = {};
  activos.forEach(a => { byUbicValor[a.ubicacion] = (byUbicValor[a.ubicacion] || 0) + (a.valor || 0); });

  const colors = {
    'LAPTOP': '#3b82f6', 'DESKTOP': '#10b981', 'MONITOR': '#f59e0b',
    'IMPRESORA': '#ef4444', 'SERVIDOR': '#8b5cf6', 'SWITCH': '#ec4899', 'ACCESS POINT': '#06b6d4'
  };

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard Financiero</h1>
        <div class="subtitle">Valorización de activos TI</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">💰</div></div>
        <div class="stat-value">S/ ${totalValor.toLocaleString()}</div>
        <div class="stat-label">Valor total de activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon blue">📊</div></div>
        <div class="stat-value">S/ ${activos.length ? Math.round(totalValor / activos.length).toLocaleString() : 0}</div>
        <div class="stat-label">Valor promedio por activo</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon purple">🏆</div></div>
        <div class="stat-value">${Object.entries(byTipoValor).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}</div>
        <div class="stat-label">Tipo con mayor inversión</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-container">
        <div class="chart-title">Inversión por Tipo de Activo</div>
        <div class="donut-chart" id="finDonut"></div>
        <div class="chart-legend" id="finLegend"></div>
      </div>
      <div class="chart-container">
        <div class="chart-title">Inversión por Ubicación</div>
        <div class="bar-chart" id="finBarChart"></div>
      </div>
    </div>
  `;

  drawDonut('finDonut', 'finLegend', byTipoValor, colors);
  drawBars('finBarChart', byUbicValor);
}

/* ═══════════════════════════════════════════════════════
   ACTIVOS TI - INGRESO
   ═══════════════════════════════════════════════════════ */
let activoFilter = 'Todos';
let activoSearch = '';

function renderIngreso(el) {
  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Registro Activo</h1>
        <div class="subtitle">Gestión y registro de activos TI</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="openActivoModal()">+ Nuevo Activo</button>
        <button class="btn" onclick="openCargaMasivaModal()" style="background:#059669;color:#fff;border-color:#059669">📥 Carga Masiva</button>
      </div>
    </div>

    <div class="table-toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="ingresoSearchInput" placeholder="Buscar por almacén, equipo, marca, modelo, origen, guía..."
               value="${esc(activoSearch)}"
               oninput="_onIngresoSearch(this.value)">
      </div>
    </div>

    <div id="ingresoTableWrap"></div>
  `;
  _renderIngresoTable();
}

let _ingresoSearchTimer = null;
function _onIngresoSearch(val) {
  activoSearch = val;
  resetPage('ingreso');
  clearTimeout(_ingresoSearchTimer);
  _ingresoSearchTimer = setTimeout(_renderIngresoTable, 120);
}

function _renderIngresoTable() {
  const wrap = document.getElementById('ingresoTableWrap');
  if (!wrap) return;
  const activos = DB.get('activos');

  const filtered = activos.filter(a => {
    if (activoSearch) {
      const s = activoSearch.toLowerCase();
      return (a.ubicacion || '').toLowerCase().includes(s) ||
             (a.equipo || '').toLowerCase().includes(s) ||
             (a.tipo || '').toLowerCase().includes(s) ||
             (a.marca || '').toLowerCase().includes(s) ||
             (a.modelo || '').toLowerCase().includes(s) ||
             (a.estadoEquipo || '').toLowerCase().includes(s) ||
             (a.origenEquipo || '').toLowerCase().includes(s) ||
             (a.nDocumento || '').toLowerCase().includes(s);
    }
    return true;
  });

  wrap.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Almacén</th>
              <th>F. Ingreso</th>
              <th>Equipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Stock</th>
              <th>Estado Equipo</th>
              <th>Origen</th>
              <th>Guía</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? '<tr><td colspan="10"><div class="empty-state"><p>No se encontraron activos</p></div></td></tr>'
              : pagSlice(filtered, 'ingreso').map(a => {
                  const stock = (a.series || []).length;
                  const eqBadge = a.estadoEquipo
                    ? `<span class="badge ${a.estadoEquipo === 'NUEVO' ? 'badge-success' : a.estadoEquipo === 'BUENO' ? 'badge-info' : a.estadoEquipo === 'REGULAR' ? 'badge-warning' : 'badge-danger'}" style="font-size:10px">${esc(a.estadoEquipo)}</span>`
                    : '—';
                  const guiaText = a.nDocumento ? `${esc(a.nDocumento)}` : '—';
                  return `
                  <tr>
                    <td style="font-size:12px">${esc(a.ubicacion || '—')}</td>
                    <td style="font-size:12px">${formatDate(a.fechaIngreso)}</td>
                    <td>${esc(a.equipo || a.tipo || '—')}</td>
                    <td>${esc(a.marca || '—')}</td>
                    <td style="font-size:12px">${esc(a.modelo || '—')}</td>
                    <td style="text-align:center"><span class="badge ${stock > 0 ? 'badge-info' : ''}" style="font-size:11px;font-weight:700">${stock}</span></td>
                    <td>${eqBadge}</td>
                    <td style="font-size:12px">${esc(a.origenEquipo || '—')}</td>
                    <td style="font-size:12px">${guiaText}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-icon" title="Editar" onclick="openActivoModal(${a.id})">✏️</button>
                        <button class="btn-icon" title="Eliminar" onclick="deleteActivo(${a.id})" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca">🗑️</button>
                        <button class="btn-icon" title="Adjuntar Guía de Ingreso" onclick="openGuiaModal(${a.id})" style="position:relative">
                          📄${a.guiaAdjunta ? '<span style="position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:#22c55e;border-radius:50%;border:1.5px solid #fff"></span>' : ''}
                        </button>
                        <button class="btn btn-sm" style="font-size:11px;padding:3px 8px;height:auto" title="Gestionar series" onclick="openSeriesModal(${a.id})">Serie</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        ${pagFooter('ingreso', filtered.length)}
      </div>
    </div>
  `;
}

function openActivoModal(id) {
  const activos    = DB.get('activos');
  const a          = id ? activos.find(x => x.id === id) : null;
  const tipos      = DB.getConfig('tipos', []);
  const tipoEquipos = DB.getConfig('tipoEquipos', {});
  const marcas     = DB.getConfig('marcas', []);
  const ubicaciones = DB.getConfig('ubicaciones', []);
  const gamas      = DB.getConfig('gamas', []);
  const estadosEquipo = DB.getConfig('estadosEquipo', []);
  const origenes   = DB.getConfig('origenes', []);
  const tiposDoc   = DB.getConfig('tipoDocumento', []);
  const sistemasOS = DB.getConfig('sistemasOS', []);

  const currentTipo  = a?.tipo || '';
  const equiposList  = currentTipo ? (tipoEquipos[currentTipo] || []) : [];

  openModal(a ? 'Editar Activo' : 'Registrar Equipos', `
    <div class="form-grid-3">

      <div class="form-group">
        <label>F.I — Fecha Ingreso</label>
        <input type="date" class="form-control" id="fFecha" value="${a?.fechaIngreso || today()}">
      </div>
      <div class="form-group">
        <label>F.C — Fecha Compra</label>
        <input type="date" class="form-control" id="fFechaCompra" value="${a?.fechaCompra || today()}">
      </div>
      <div class="form-group">
        <label>Almacén</label>
        <select class="form-control" id="fUbicacion">
          <option value="">Seleccione Almacén</option>
          ${optionsHTML(ubicaciones, a?.ubicacion)}
        </select>
      </div>

      <div class="form-group">
        <label>Tipo Documento</label>
        <select class="form-control" id="fTipoDoc">
          <option value="">Seleccione Documento</option>
          ${optionsHTML(tiposDoc, a?.tipoDocumento)}
        </select>
      </div>
      <div class="form-group span2">
        <label>N° Documento</label>
        <div class="input-icon-wrap">
          <span class="iw-icon">🔢</span>
          <input class="form-control" id="fNDoc" placeholder="Ingrese el número del documento" value="${esc(a?.nDocumento || '')}">
        </div>
      </div>

      <div class="form-group">
        <label>Tipo Equipo <span class="required">*</span></label>
        <select class="form-control" id="fTipo" onchange="loadEquiposByTipo(this.value);toggleCamposTipo()">
          <option value="">Seleccionar...</option>
          ${optionsHTML(tipos, currentTipo)}
        </select>
      </div>
      <div class="form-group">
        <label>Equipo</label>
        <select class="form-control" id="fEquipo">
          <option value="">Seleccionar...</option>
          ${optionsHTML(equiposList, a?.equipo)}
        </select>
      </div>
      <div class="form-group">
        <label>Marca <span class="required">*</span></label>
        <select class="form-control" id="fMarca">
          <option value="">Seleccionar...</option>
          ${optionsHTML(marcas, a?.marca)}
        </select>
      </div>

      <div class="form-group">
        <label>Modelo <span class="required">*</span></label>
        <div class="input-icon-wrap">
          <span class="iw-icon">💻</span>
          <input class="form-control" id="fModelo" placeholder="Ingrese el modelo" value="${esc(a?.modelo || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>SKU</label>
        <div class="input-icon-wrap">
          <span class="iw-icon">🏷️</span>
          <input class="form-control" id="fSku" placeholder="Ingrese el SKU" value="${esc(a?.sku || '')}">
        </div>
      </div>
      <div class="form-group" id="grpProcesador" style="display:${['Laptop','Desktop'].includes(currentTipo) ? '' : 'none'}">
        <label>Procesador</label>
        <div class="input-icon-wrap">
          <span class="iw-icon">🖥️</span>
          <input class="form-control" id="fProcesador" placeholder="Ingrese el procesador" value="${esc(a?.procesador || '')}">
        </div>
      </div>
      <div class="form-group" id="grpGama" style="display:${['Laptop','Desktop'].includes(currentTipo) ? '' : 'none'}">
        <label>Gama</label>
        <select class="form-control" id="fGama">
          <option value="">Seleccionar...</option>
          ${optionsHTML(gamas, a?.gama)}
        </select>
      </div>

      <div class="form-group" id="grpSO" style="display:${['Laptop','Desktop'].includes(currentTipo) ? '' : 'none'}">
        <label>Sistema Operativo</label>
        <select class="form-control" id="fSO">
          <option value="">Seleccionar...</option>
          ${optionsHTML(sistemasOS, a?.sistemaOperativo)}
        </select>
      </div>
      <div class="form-group">
        <label>Origen</label>
        <select class="form-control" id="fOrigenEquipo" onchange="toggleAdendaFields()">
          <option value="">Seleccione Origen</option>
          ${optionsHTML(origenes, a?.origenEquipo)}
        </select>
      </div>
      <div class="form-group">
        <label>Estado Equipo</label>
        <select class="form-control" id="fEstadoEquipo">
          <option value="">Seleccionar...</option>
          ${optionsHTML(estadosEquipo, a?.estadoEquipo)}
        </select>
      </div>
      <div class="form-group">
        <label>Costo (S/)</label>
        <div class="input-icon-wrap">
          <span class="iw-icon">S/</span>
          <input type="number" step="0.01" min="0" class="form-control" id="fCosto" placeholder="0.00" value="${a?.costo || ''}">
        </div>
      </div>

      <div id="adendaSection" class="form-group full" style="display:${a?.origenEquipo === 'ALQUILADO' ? 'block' : 'none'}">
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px">
          <div style="font-weight:600;color:#92400e;margin-bottom:10px;font-size:13px">📋 Datos de Adenda — Equipo Alquilado</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div class="form-group" style="margin:0">
              <label style="font-size:12px">N° Adenda</label>
              <input class="form-control" id="fAdenda" placeholder="N° de adenda" value="${esc(a?.adenda || '')}">
            </div>
            <div class="form-group" style="margin:0">
              <label style="font-size:12px">Fecha Inicial</label>
              <input type="date" class="form-control" id="fAdendaInicio" value="${a?.adendaFechaInicio || ''}">
            </div>
            <div class="form-group" style="margin:0">
              <label style="font-size:12px">Fecha Final</label>
              <input type="date" class="form-control" id="fAdendaFin" value="${a?.adendaFechaFin || ''}">
            </div>
          </div>
        </div>
      </div>

      <div class="form-group full">
        <label>Descripción</label>
        <div class="input-icon-wrap">
          <span class="iw-icon" style="align-self:flex-start;margin-top:11px">≡</span>
          <textarea class="form-control" id="fObs" rows="2" placeholder="Ingrese la descripción">${esc(a?.observaciones || '')}</textarea>
        </div>
      </div>

    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveActivo(${id || 'null'})">${a ? 'Guardar Cambios' : 'Guardar'}</button>
  `, 'modal-lg');
}

function toggleAdendaFields() {
  const origen = document.getElementById('fOrigenEquipo');
  const section = document.getElementById('adendaSection');
  if (!origen || !section) return;
  section.style.display = origen.value === 'ALQUILADO' ? 'block' : 'none';
  if (origen.value !== 'ALQUILADO') {
    const fA = document.getElementById('fAdenda');
    const fI = document.getElementById('fAdendaInicio');
    const fF = document.getElementById('fAdendaFin');
    if (fA) fA.value = '';
    if (fI) fI.value = '';
    if (fF) fF.value = '';
  }
}

const _TIPOS_CON_SPECS = ['LAPTOP', 'DESKTOP'];
function _esTipoConSpecs(tipo) { return _TIPOS_CON_SPECS.some(t => t.toLowerCase() === (tipo || '').toLowerCase()); }
function toggleCamposTipo() {
  const tipo = (document.getElementById('fTipo') || {}).value || '';
  const show = _esTipoConSpecs(tipo);
  ['grpProcesador', 'grpGama', 'grpSO'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  });
}

function loadEquiposByTipo(tipoVal) {
  const tipoEquipos = DB.getConfig('tipoEquipos', {});
  const equipos = tipoVal ? (tipoEquipos[tipoVal] || []) : [];
  const sel = document.getElementById('fEquipo');
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleccionar...</option>' +
    equipos.map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join('');
}

function saveActivo(id) {
  const tipo  = document.getElementById('fTipo').value;
  const marca = document.getElementById('fMarca').value;
  const modelo = document.getElementById('fModelo').value.trim();

  if (!tipo || !marca || !modelo) {
    showToast('Completa los campos obligatorios: Tipo, Marca y Modelo', 'error');
    return;
  }

  const campos = upperFields({
    fechaIngreso:     document.getElementById('fFecha').value || today(),
    fechaCompra:      document.getElementById('fFechaCompra').value,
    ubicacion:        document.getElementById('fUbicacion').value,
    tipoDocumento:    document.getElementById('fTipoDoc').value,
    nDocumento:       document.getElementById('fNDoc').value.trim(),
    tipo,
    equipo:           document.getElementById('fEquipo').value,
    marca,
    modelo,
    sku:              document.getElementById('fSku').value.trim(),
    procesador:       document.getElementById('fProcesador').value.trim(),
    gama:             document.getElementById('fGama').value,
    sistemaOperativo: document.getElementById('fSO').value,
    origenEquipo:     document.getElementById('fOrigenEquipo').value,
    adenda:           document.getElementById('fAdenda').value.trim(),
    adendaFechaInicio: document.getElementById('fAdendaInicio').value,
    adendaFechaFin:   document.getElementById('fAdendaFin').value,
    estadoEquipo:     document.getElementById('fEstadoEquipo').value,
    costo:            parseFloat(document.getElementById('fCosto').value) || 0,
    observaciones:    document.getElementById('fObs').value.trim(),
    estado:           'Disponible',
  });

  const activos = DB.get('activos');

  if (id) {
    const idx = activos.findIndex(a => a.id === id);
    if (idx >= 0) {
      activos[idx] = { ...activos[idx], ...campos };
      addMovimiento('Edición', `Activo ${activos[idx].codigo} actualizado`);
    }
  } else {
    const newId = nextId(activos);
    const codigo = 'ATI-' + String(newId).padStart(5, '0');
    activos.push({ id: newId, codigo, series: [], ...campos });
    addMovimiento('Ingreso', `Nuevo activo ${codigo} registrado (${tipo} ${marca})`);

    // Auto-registrar en bitácora: INGRESO de nuevo activo
    _autoBitacora({
      movimiento: 'INGRESO',
      almacen: (campos.ubicacion || 'Almacen TI'),
      tipoEquipo: tipo || '',
      equipo: campos.equipo || tipo || '',
      modelo: modelo || '',
      serie: '',
      inv: '',
      motivo: ''
    });
  }

  DB.set('activos', activos);
  closeModal();
  showToast(id ? 'Activo actualizado' : 'Activo registrado — agrega las series desde Acciones › Serie');
  renderIngreso(document.getElementById('contentArea'));
}

function deleteActivo(id) {
  if (!confirm('¿Está seguro de eliminar este activo?')) return;
  const activos = DB.get('activos');
  const a = activos.find(x => x.id === id);
  DB.set('activos', activos.filter(x => x.id !== id));
  if (a) addMovimiento('Eliminación', `Activo ${a.codigo} eliminado`);
  showToast('Activo eliminado');
  renderIngreso(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   CARGA MASIVA DESDE EXCEL
   ═══════════════════════════════════════════════════════ */
let _cargaMasivaData = [];
let _cargaMasivaPage = 1;
const _CM_PAGE_SIZE = 15;

const _CM_COLUMNS = [
  { excel: 'ALMACEN',           field: 'ubicacion' },
  { excel: 'F_INGRESO',         field: 'fechaIngreso' },
  { excel: 'TIPO',              field: 'tipo',            required: true },
  { excel: 'EQUIPO',            field: 'equipo' },
  { excel: 'MARCA',             field: 'marca',           required: true },
  { excel: 'MODELO',            field: 'modelo',          required: true },
  { excel: 'SKU',               field: 'sku' },
  { excel: 'PROCESADOR',        field: 'procesador' },
  { excel: 'GAMA',              field: 'gama' },
  { excel: 'SISTEMA_OPERATIVO', field: 'sistemaOperativo' },
  { excel: 'ESTADO_EQUIPO',     field: 'estadoEquipo' },
  { excel: 'COSTO',             field: 'costo' },
  { excel: 'ORIGEN',            field: 'origenEquipo' },
  { excel: 'ADENDA',            field: 'adenda' },
  { excel: 'FECHA_INICIAL',     field: 'adendaFechaInicio' },
  { excel: 'FECHA_FINAL',       field: 'adendaFechaFin' },
  { excel: 'TIPO_DOCUMENTO',    field: 'tipoDocumento' },
  { excel: 'N_DOCUMENTO',       field: 'nDocumento' },
  { excel: 'SERIE',             field: 'serie' },
  { excel: 'COD_INVENTARIO',    field: 'codInventario' },
  { excel: 'RAM',               field: 'ram' },
  { excel: 'ALMACENAMIENTO',    field: 'almacenamiento' },
  { excel: 'OBSERVACIONES',     field: 'observaciones' }
];

function openCargaMasivaModal() {
  _cargaMasivaData = [];
  _cargaMasivaPage = 1;
  openModal('Carga Masiva de Equipos', `
    <div id="cmContainer">
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:12px">📥</div>
        <p style="color:var(--text);font-weight:600;margin-bottom:4px">Importar equipos desde Excel</p>
        <p style="color:var(--text-light);font-size:13px;margin-bottom:20px">Sube un archivo .xlsx o .xls con los datos de los equipos</p>
        <div style="display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap">
          <label style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:var(--primary);color:#fff;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500">
            📂 Seleccionar archivo
            <input type="file" id="cmFileInput" accept=".xlsx,.xls" style="display:none" onchange="procesarExcel(this.files[0])">
          </label>
          <button class="btn" onclick="descargarPlantillaExcel()" style="font-size:13px">📋 Descargar Plantilla</button>
        </div>
        <p style="font-size:11px;color:var(--text-light);margin-top:12px">Descarga la plantilla para ver el formato correcto de columnas</p>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
}

function descargarPlantillaExcel() {
  const headers = _CM_COLUMNS.map(c => c.excel);
  const ejemplo = [
    'Almacén Central', '23/02/2026', 'Laptop', 'Laptop', 'HP', 'ProBook 840 G3',
    'SKU-HP840G3', 'Core i5', 'GAMA A', 'WIN 11', 'NUEVO', '2500', 'ALQUILADO',
    'ADENDA-001', '01/01/2026', '31/12/2026', 'Guía de Remisión', 'GR-001',
    'SN123ABC456', 'INV-001', '8 GB', '256 GB', 'Lote de prueba'
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  ws['!cols'] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
  XLSX.writeFile(wb, 'Plantilla_Carga_Masiva.xlsx');
  showToast('Plantilla descargada');
}

function procesarExcel(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        showToast('El archivo está vacío', 'error');
        return;
      }

      const dateFields = ['fechaIngreso', 'adendaFechaInicio', 'adendaFechaFin'];
      // Valores válidos desde configuración (case-insensitive)
      const _vTipos     = DB.getConfig('tipos', []).map(v => v.toUpperCase());
      const _vEstadosEq = DB.getConfig('estadosEquipo', []).map(v => v.toUpperCase());
      const _vOrigenes  = DB.getConfig('origenes', []).map(v => v.toUpperCase());
      const _vUbicaciones = DB.getConfig('ubicaciones', []).map(v => v.toUpperCase());

      _cargaMasivaData = rows.map((row, i) => {
        const mapped = {};
        // Mapeo case-insensitive de columnas
        const rowKeys = Object.keys(row);
        _CM_COLUMNS.forEach(col => {
          const matchKey = rowKeys.find(k => k.toUpperCase().replace(/\s+/g, '_') === col.excel.toUpperCase()) || col.excel;
          let val = row[matchKey];
          if (val === undefined || val === null) val = '';
          mapped[col.field] = (val instanceof Date) ? normalizeDate(val) : String(val).trim();
        });
        // Normalizar fechas (seriales, dd/mm/yyyy, etc.)
        dateFields.forEach(f => { if (mapped[f]) mapped[f] = normalizeDate(mapped[f]); });
        // Convertir a mayúsculas
        Object.keys(mapped).forEach(k => { if (typeof mapped[k] === 'string' && !_SKIP_UPPER.includes(k)) mapped[k] = mapped[k].toUpperCase(); });
        // Validación por campo
        const fieldErrors = {};
        // Campos obligatorios
        if (!mapped.tipo)   fieldErrors.tipo = 'Vacío';
        if (!mapped.marca)  fieldErrors.marca = 'Vacío';
        if (!mapped.modelo) fieldErrors.modelo = 'Vacío';
        // Validar valores contra catálogos
        if (mapped.tipo && _vTipos.length && !_vTipos.includes(mapped.tipo.toUpperCase()))
          fieldErrors.tipo = 'No existe en catálogo';
        if (mapped.estadoEquipo && _vEstadosEq.length && !_vEstadosEq.includes(mapped.estadoEquipo.toUpperCase()))
          fieldErrors.estadoEquipo = 'No existe en catálogo';
        if (mapped.origenEquipo && _vOrigenes.length && !_vOrigenes.includes(mapped.origenEquipo.toUpperCase()))
          fieldErrors.origenEquipo = 'No existe en catálogo';
        if (mapped.ubicacion && _vUbicaciones.length && !_vUbicaciones.includes(mapped.ubicacion.toUpperCase()))
          fieldErrors.ubicacion = 'No existe en catálogo';
        // Validar fechas
        dateFields.forEach(f => {
          if (mapped[f] && !/^\d{4}-\d{2}-\d{2}$/.test(mapped[f]))
            fieldErrors[f] = 'Formato inválido';
        });
        // Validar costo
        if (mapped.costo && isNaN(parseFloat(mapped.costo)))
          fieldErrors.costo = 'No es número';

        const hasErrors = Object.keys(fieldErrors).length > 0;
        return { ...mapped, _row: i + 2, _fieldErrors: fieldErrors, _valid: !hasErrors };
      });

      // Validar series duplicadas (solo las que el usuario ingresó, no las vacías)
      const _seriesEnArchivo = {};
      const _activosDB = DB.get('activos');
      const _seriesEnBD = new Set();
      _activosDB.forEach(a => (a.series || []).forEach(s => { if (s.serie) _seriesEnBD.add(s.serie.toUpperCase()); }));

      _cargaMasivaData.forEach((r, i) => {
        if (!r.serie) return; // Serie vacía se autogenerará, no validar
        const su = r.serie.toUpperCase();
        // Duplicada en BD
        if (_seriesEnBD.has(su)) {
          r._fieldErrors = r._fieldErrors || {};
          r._fieldErrors.serie = 'Ya existe en BD';
          r._valid = false;
        }
        // Duplicada dentro del mismo archivo
        if (_seriesEnArchivo[su] !== undefined) {
          r._fieldErrors = r._fieldErrors || {};
          r._fieldErrors.serie = 'Duplicada en archivo (fila ' + _seriesEnArchivo[su] + ')';
          r._valid = false;
          // Marcar también la primera ocurrencia
          const firstIdx = _cargaMasivaData.findIndex(x => x._row === _seriesEnArchivo[su]);
          if (firstIdx >= 0 && _cargaMasivaData[firstIdx].serie) {
            _cargaMasivaData[firstIdx]._fieldErrors = _cargaMasivaData[firstIdx]._fieldErrors || {};
            _cargaMasivaData[firstIdx]._fieldErrors.serie = 'Duplicada en archivo (fila ' + r._row + ')';
            _cargaMasivaData[firstIdx]._valid = false;
          }
        } else {
          _seriesEnArchivo[su] = r._row;
        }
      });

      _cargaMasivaPage = 1;
      _renderCargaMasivaPreview();
    } catch (err) {
      showToast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function _renderCargaMasivaPreview() {
  const container = document.getElementById('cmContainer');
  if (!container) return;

  const total = _cargaMasivaData.length;
  const validos = _cargaMasivaData.filter(r => r._valid).length;
  const errores = total - validos;

  // Calcular modelos agrupados
  const lotesTemp = {};
  _cargaMasivaData.filter(r => r._valid).forEach(r => {
    const key = [r.tipo, r.marca, r.modelo].join('||').toLowerCase();
    if (!lotesTemp[key]) lotesTemp[key] = 0;
    lotesTemp[key]++;
  });
  const nLotes = Object.keys(lotesTemp).length;

  const tp = Math.max(1, Math.ceil(total / _CM_PAGE_SIZE));
  if (_cargaMasivaPage > tp) _cargaMasivaPage = tp;
  const start = (_cargaMasivaPage - 1) * _CM_PAGE_SIZE;
  const pageData = _cargaMasivaData.slice(start, start + _CM_PAGE_SIZE);

  container.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#eff6ff;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#2563eb">${nLotes}</div>
        <div style="font-size:11px;color:#1d4ed8">Lotes</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#f0fdf4;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#16a34a">${validos}</div>
        <div style="font-size:11px;color:#15803d">Series válidas</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:${errores > 0 ? '#fef2f2' : '#f8fafc'};border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:${errores > 0 ? '#dc2626' : '#94a3b8'}">${errores}</div>
        <div style="font-size:11px;color:${errores > 0 ? '#b91c1c' : '#64748b'}">Con errores</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#f8fafc;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#334155">${total}</div>
        <div style="font-size:11px;color:#64748b">Filas Excel</div>
      </div>
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#1e40af">ℹ️ Las filas con mismo Tipo + Marca + Modelo se fusionarán en <strong>${nLotes} modelo(s)</strong>. Celdas <span style="background:#dcfce7;padding:1px 6px;border-radius:3px">verdes</span> = correctas, <span style="background:#fecaca;padding:1px 6px;border-radius:3px">rojas</span> = con error.</div>
    ${errores > 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#991b1b">⚠️ <strong>${errores} fila(s) con error</strong> no se importarán. Revisa las celdas marcadas en rojo.</div>` : ''}

    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;font-size:12px">
        <thead>
          <tr>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">#</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Tipo *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Marca *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Modelo *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Serie</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Cod. Inv.</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">RAM</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Disco</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Estado Eq.</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Origen</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Almacén</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">F.Ingreso</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary);text-align:center">✓</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Error</th>
          </tr>
        </thead>
        <tbody>
          ${pageData.map(r => {
            const fe = r._fieldErrors || {};
            const errList = Object.entries(fe).map(([k, v]) => k + ': ' + v).join(' | ');
            const ok = 'background:#dcfce7';
            const bad = 'background:#fecaca';
            const cellStyle = (field, val) => fe[field] ? bad : val ? ok : '';
            return `
            <tr>
              <td style="padding:6px;color:var(--text-light)">${r._row}</td>
              <td style="padding:6px;${cellStyle('tipo', r.tipo)}" ${fe.tipo ? 'title="'+esc(fe.tipo)+'"' : ''}>${esc(r.tipo || '—')}</td>
              <td style="padding:6px;${cellStyle('marca', r.marca)}" ${fe.marca ? 'title="'+esc(fe.marca)+'"' : ''}>${esc(r.marca || '—')}</td>
              <td style="padding:6px;${cellStyle('modelo', r.modelo)}" ${fe.modelo ? 'title="'+esc(fe.modelo)+'"' : ''}>${esc(r.modelo || '—')}</td>
              <td style="padding:6px;font-size:11px;${cellStyle('serie', r.serie)}" ${fe.serie ? 'title="'+esc(fe.serie)+'"' : ''}>${esc(r.serie || '—')}</td>
              <td style="padding:6px;font-size:11px;${r.codInventario ? ok : ''}">${esc(r.codInventario || '—')}</td>
              <td style="padding:6px;font-size:11px;${r.ram ? ok : ''}">${esc(r.ram || '—')}</td>
              <td style="padding:6px;font-size:11px;${r.almacenamiento ? ok : ''}">${esc(r.almacenamiento || '—')}</td>
              <td style="padding:6px;${cellStyle('estadoEquipo', r.estadoEquipo)}" ${fe.estadoEquipo ? 'title="'+esc(fe.estadoEquipo)+'"' : ''}>${esc(r.estadoEquipo || '—')}</td>
              <td style="padding:6px;${cellStyle('origenEquipo', r.origenEquipo)}" ${fe.origenEquipo ? 'title="'+esc(fe.origenEquipo)+'"' : ''}>${esc(r.origenEquipo || '—')}</td>
              <td style="padding:6px;font-size:11px;${cellStyle('ubicacion', r.ubicacion)}" ${fe.ubicacion ? 'title="'+esc(fe.ubicacion)+'"' : ''}>${esc(r.ubicacion || '—')}</td>
              <td style="padding:6px;font-size:11px;${cellStyle('fechaIngreso', r.fechaIngreso)}" ${fe.fechaIngreso ? 'title="'+esc(fe.fechaIngreso)+'"' : ''}>${r.fechaIngreso ? formatDate(r.fechaIngreso) : '—'}</td>
              <td style="padding:6px;text-align:center">${r._valid
                ? '<span style="color:#16a34a;font-weight:700">✓</span>'
                : '<span style="color:#dc2626;font-weight:700">✗</span>'}</td>
              <td style="padding:6px;font-size:11px;color:#dc2626;max-width:220px;word-break:break-word">${r._valid ? '' : esc(errList)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${tp > 1 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;color:var(--text-light)">
        <span>Mostrando ${start + 1}–${Math.min(start + _CM_PAGE_SIZE, total)} de ${total}</span>
        <div style="display:flex;gap:4px">
          ${_cargaMasivaPage > 1 ? `<button class="btn btn-sm" onclick="_cargaMasivaPage--;_renderCargaMasivaPreview()" style="font-size:11px;padding:3px 8px">‹ Ant</button>` : ''}
          <span style="padding:3px 8px;font-weight:600">${_cargaMasivaPage} / ${tp}</span>
          ${_cargaMasivaPage < tp ? `<button class="btn btn-sm" onclick="_cargaMasivaPage++;_renderCargaMasivaPreview()" style="font-size:11px;padding:3px 8px">Sig ›</button>` : ''}
        </div>
      </div>
    ` : ''}

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
      <label style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-light)">
        📂 Cambiar archivo
        <input type="file" accept=".xlsx,.xls" style="display:none" onchange="procesarExcel(this.files[0])">
      </label>
      ${validos > 0 ? `<button class="btn btn-primary" onclick="ejecutarCargaMasiva()" style="font-size:13px">📥 Importar ${nLotes} lote${nLotes > 1 ? 's' : ''} (${validos} series)</button>` : ''}
    </div>
  `;

  // Actualizar footer del modal
  const footer = document.getElementById('modalFooter');
  if (footer) footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`;
}

/**
 * Genera una abreviatura de 3 letras a partir del nombre del equipo.
 * Ej: "TECLADO USB" → "TCL", "MOUSE USB" → "MOU", "MONITOR" → "MON"
 */
function _abreviarEquipo(equipo) {
  const name = (equipo || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (name.length <= 3) return (name + 'XXX').substring(0, 3);
  // Tomar primera, segunda y tercera consonante; si no alcanza, rellenar con vocales
  const consonantes = name.replace(/[AEIOU]/g, '');
  if (consonantes.length >= 3) return consonantes.substring(0, 3);
  // Fallback: primeras 3 letras del nombre limpio
  return name.substring(0, 3);
}

/**
 * Genera una serie interna única para un accesorio.
 * Formato: ABR + 8 dígitos correlativos (ej: TCL00000001)
 * Busca el máximo correlativo existente en activos y en las series pendientes del lote actual.
 */
function _generarSerieInterna(equipo, seriesExistentesGlobal) {
  const abr = _abreviarEquipo(equipo);
  const regex = new RegExp('^' + abr + '(\\d+)$', 'i');
  let maxCorr = 0;

  // Buscar en todas las series de todos los activos existentes
  const activos = DB.get('activos');
  activos.forEach(a => {
    (a.series || []).forEach(s => {
      const m = (s.serie || '').match(regex);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxCorr) maxCorr = n;
      }
    });
  });

  // Buscar también en las series ya generadas en este lote (para evitar duplicados intra-lote)
  (seriesExistentesGlobal || []).forEach(serie => {
    const m = (serie || '').match(regex);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxCorr) maxCorr = n;
    }
  });

  maxCorr++;
  return abr + String(maxCorr).padStart(8, '0');
}

function ejecutarCargaMasiva() {
  const validos = _cargaMasivaData.filter(r => r._valid);
  if (validos.length === 0) { showToast('No hay registros válidos para importar', 'error'); return; }

  if (!confirm('¿Importar ' + validos.length + ' equipos?')) return;

  // Agrupar filas por modelo (mismo tipo + marca + modelo)
  const lotes = {};
  const _seriesGeneradas = []; // Acumulador de series autogeneradas para evitar duplicados intra-lote
  validos.forEach(r => {
    const key = [r.tipo, r.marca, r.modelo].join('||').toLowerCase();
    if (!lotes[key]) {
      lotes[key] = { data: r, series: [] };
    }
    const _esAccesorio = (r.tipo || '').toUpperCase() === 'ACCESORIO';
    let serieVal = (r.serie || '').trim();

    // Si es accesorio y no tiene serie, generar serie interna automática
    if (!serieVal && _esAccesorio) {
      serieVal = _generarSerieInterna(r.equipo || r.tipo, _seriesGeneradas);
      _seriesGeneradas.push(serieVal);
    }

    if (serieVal) {
      lotes[key].series.push({
        serie: serieVal,
        codInventario: r.codInventario || '',
        ram: r.ram || '',
        almacenamiento: r.almacenamiento || ''
      });
    }
  });

  const activos = DB.get('activos');
  let lastId = activos.length > 0 ? Math.max(...activos.map(a => a.id)) : 0;
  const lotesKeys = Object.keys(lotes);
  let nuevos = 0, fusionados = 0;

  lotesKeys.forEach(key => {
    const { data: r, series } = lotes[key];

    // Buscar si ya existe un activo con el mismo tipo+marca+modelo
    const existente = activos.find(a =>
      (a.tipo || '').toLowerCase() === (r.tipo || '').toLowerCase() &&
      (a.marca || '').toLowerCase() === (r.marca || '').toLowerCase() &&
      (a.modelo || '').toLowerCase() === (r.modelo || '').toLowerCase()
    );

    if (existente) {
      // Fusionar: agregar series nuevas al activo existente (evitar duplicados por número de serie)
      const seriesExistentes = new Set((existente.series || []).map(s => s.serie));
      series.forEach(s => {
        if (!seriesExistentes.has(s.serie)) {
          existente.series.push(s);
        }
      });
      // Actualizar campos si estaban vacíos
      if (!existente.ubicacion && r.ubicacion) existente.ubicacion = r.ubicacion;
      if (!existente.origenEquipo && r.origenEquipo) existente.origenEquipo = r.origenEquipo;
      if (!existente.nDocumento && r.nDocumento) existente.nDocumento = r.nDocumento;
      if (!existente.estadoEquipo && r.estadoEquipo) existente.estadoEquipo = r.estadoEquipo;
      fusionados++;
    } else {
      // Crear nuevo activo
      lastId++;
      const codigo = 'ATI-' + String(lastId).padStart(5, '0');
      activos.push({
        id: lastId,
        codigo,
        tipo:             r.tipo,
        equipo:           r.equipo || r.tipo,
        marca:            r.marca,
        modelo:           r.modelo,
        sku:              r.sku || '',
        procesador:       r.procesador || '',
        gama:             r.gama || '',
        sistemaOperativo: r.sistemaOperativo || '',
        estadoEquipo:     r.estadoEquipo || '',
        costo:            parseFloat(r.costo) || 0,
        origenEquipo:     r.origenEquipo || '',
        adenda:           r.adenda || '',
        adendaFechaInicio: r.adendaFechaInicio || '',
        adendaFechaFin:   r.adendaFechaFin || '',
        ubicacion:        r.ubicacion || '',
        tipoDocumento:    r.tipoDocumento || '',
        nDocumento:       r.nDocumento || '',
        observaciones:    r.observaciones || '',
        fechaIngreso:     r.fechaIngreso || today(),
        fechaCompra:      '',
        estado:           'Disponible',
        series
      });
      nuevos++;
    }
  });

  DB.set('activos', activos);
  const totalSeries = Object.values(lotes).reduce((s, l) => s + l.series.length, 0);
  const resumen = [];
  if (nuevos > 0) resumen.push(nuevos + ' modelo(s) nuevo(s)');
  if (fusionados > 0) resumen.push(fusionados + ' modelo(s) actualizado(s)');
  addMovimiento('Carga Masiva', resumen.join(', ') + ' con ' + totalSeries + ' series desde Excel');

  // Auto-registrar en bitácora: INGRESO por cada serie cargada
  Object.values(lotes).forEach(l => {
    const rd = l.data || {};
    (l.series || []).forEach(s => {
      _autoBitacora({
        movimiento: 'INGRESO',
        almacen: (rd.ubicacion || 'Almacen TI'),
        tipoEquipo: rd.tipo || '',
        equipo: rd.equipo || rd.tipo || '',
        modelo: rd.modelo || '',
        serie: s.serie || '',
        inv: s.codInventario || '',
        motivo: ''
      });
    });
  });

  _cargaMasivaData = [];
  closeModal();
  showToast(resumen.join(', ') + ' — ' + totalSeries + ' series importadas');
  renderIngreso(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   GUÍA DE INGRESO — ADJUNTAR DOCUMENTO
   ═══════════════════════════════════════════════════════ */
function openGuiaModal(activoId) {
  const activos = DB.get('activos');
  const a = activos.find(x => x.id === activoId);
  if (!a) return;
  const guia = a.guiaAdjunta;

  let preview = '';
  if (guia) {
    const isImage = guia.tipo && guia.tipo.startsWith('image/');
    const isPDF   = guia.tipo && guia.tipo === 'application/pdf';
    if (isImage) {
      preview = `<div style="margin-bottom:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden;max-height:300px;display:flex;justify-content:center;background:#f8f8f8">
        <img src="${guia.data}" alt="${esc(guia.nombre)}" style="max-width:100%;max-height:300px;object-fit:contain">
      </div>`;
    } else if (isPDF) {
      preview = `<div style="margin-bottom:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden;height:300px">
        <iframe src="${guia.data}" style="width:100%;height:100%;border:none"></iframe>
      </div>`;
    } else {
      const ext = guia.nombre.split('.').pop().toLowerCase();
      const icons = { doc: '📝', docx: '📝', xls: '📊', xlsx: '📊' };
      preview = `<div style="margin-bottom:12px;text-align:center"><div style="font-size:56px">${icons[ext] || '📄'}</div></div>`;
    }
  }

  const contenido = guia
    ? `<div style="padding:10px 0">
        ${preview}
        <div style="text-align:center">
          <div style="font-weight:600;color:var(--text);margin-bottom:4px">${esc(guia.nombre)}</div>
          <div style="font-size:12px;color:var(--text-light);margin-bottom:4px">${esc(guia.tipo)} — ${(guia.tamano / 1024).toFixed(1)} KB</div>
          <div style="font-size:11px;color:var(--text-light);margin-bottom:16px">Adjuntado el ${formatDate(guia.fecha)}</div>
          <div style="display:flex;gap:8px;justify-content:center">
            <button class="btn btn-sm btn-primary" onclick="downloadGuia(${activoId})" style="font-size:12px">⬇ Descargar</button>
            <button class="btn btn-sm" onclick="removeGuiaAdjunta(${activoId})" style="font-size:12px;color:#ef4444;border-color:#ef4444">🗑 Eliminar</button>
          </div>
          <hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">
          <p style="font-size:12px;color:var(--text-light);margin-bottom:8px">Reemplazar documento:</p>
          <input type="file" id="fGuiaFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" style="font-size:12px">
        </div>
      </div>`
    : `<div style="text-align:center;padding:10px 0">
        <div style="font-size:48px;margin-bottom:10px;opacity:0.4">📄</div>
        <p style="color:var(--text-light);margin-bottom:16px;font-size:13px">No hay guía adjunta para este lote.</p>
        <label style="font-size:13px;font-weight:500;color:var(--text);display:block;margin-bottom:8px">Seleccionar archivo:</label>
        <input type="file" id="fGuiaFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" style="font-size:12px">
        <p style="font-size:11px;color:var(--text-light);margin-top:8px">PDF, imágenes, Word o Excel</p>
      </div>`;

  openModal('Guía de Ingreso — ' + esc(a.codigo), contenido, `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    <button class="btn btn-primary" onclick="saveGuiaAdjunta(${activoId})">Adjuntar</button>
  `);
}

function saveGuiaAdjunta(activoId) {
  const fileInput = document.getElementById('fGuiaFile');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showToast('Selecciona un archivo para adjuntar', 'error');
    return;
  }
  const file = fileInput.files[0];
  if (file.size > 5 * 1024 * 1024) {
    showToast('El archivo no debe superar 5 MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const activos = DB.get('activos');
    const idx = activos.findIndex(a => a.id === activoId);
    if (idx < 0) return;
    activos[idx].guiaAdjunta = {
      nombre: file.name,
      tipo: file.type || 'application/octet-stream',
      tamano: file.size,
      data: e.target.result,
      fecha: today()
    };
    DB.set('activos', activos);
    closeModal();
    showToast('Guía adjuntada correctamente');
    renderIngreso(document.getElementById('contentArea'));
  };
  reader.readAsDataURL(file);
}

function removeGuiaAdjunta(activoId) {
  if (!confirm('¿Eliminar la guía adjunta?')) return;
  const activos = DB.get('activos');
  const idx = activos.findIndex(a => a.id === activoId);
  if (idx < 0) return;
  delete activos[idx].guiaAdjunta;
  DB.set('activos', activos);
  closeModal();
  showToast('Guía eliminada');
  renderIngreso(document.getElementById('contentArea'));
}

function downloadGuia(activoId) {
  const activos = DB.get('activos');
  const a = activos.find(x => x.id === activoId);
  if (!a || !a.guiaAdjunta) return;
  const link = document.createElement('a');
  link.href = a.guiaAdjunta.data;
  link.download = a.guiaAdjunta.nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ═══════════════════════════════════════════════════════
   SERIES DE ACTIVO
   ═══════════════════════════════════════════════════════ */
let _seriesBackup = null;
let _seriesBackupId = null;

function openSeriesModal(activoId) {
  _seriesPage = 1;
  const activos = DB.get('activos');
  const a = activos.find(x => x.id === activoId);
  if (!a) return;
  const series = a.series || [];
  // Guardar snapshot para revertir con Cancelar
  _seriesBackup = JSON.parse(JSON.stringify(series));
  _seriesBackupId = activoId;
  const ramOpts = DB.getConfig('opcionesRAM', []);
  const almOpts = DB.getConfig('opcionesAlmacenamiento', []);
  const tipoActivo = a.tipo || '';
  const esLaptopDesktop = _esTipoConSpecs(tipoActivo);
  const esAccesorio = tipoActivo.toLowerCase() === 'accesorio';

  const ramAlmHTML = esLaptopDesktop ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text);display:block;margin-bottom:4px">RAM</label>
          <select class="form-control" id="fNuevaRAM">
            <option value="">Seleccionar...</option>
            ${ramOpts.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text);display:block;margin-bottom:4px">Almacenamiento</label>
          <select class="form-control" id="fNuevaAlm">
            <option value="">Seleccionar...</option>
            ${almOpts.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')}
          </select>
        </div>
      </div>` : '';

  const autoSerieHTML = esAccesorio ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#15803d;font-weight:500">
          <input type="checkbox" id="fAutoSerie" onchange="toggleAutoSerie(${activoId})">
          Generar serie automática (accesorio sin serie)
        </label>
        <div id="autoSeriePreview" style="display:none;margin-top:8px">
          <div style="display:flex;gap:8px;align-items:center">
            <div style="flex:1">
              <label style="font-size:11px;color:var(--text-light);display:block;margin-bottom:3px">Cantidad a generar</label>
              <input type="number" class="form-control" id="fAutoSerieCant" min="1" max="500" value="1" style="font-size:13px">
            </div>
            <button class="btn btn-primary" onclick="generarSeriesAuto(${activoId})" style="height:38px;padding:0 14px;font-size:12px;margin-top:14px">Generar</button>
          </div>
          <p style="font-size:11px;color:var(--text-light);margin-top:6px">Nomenclatura: <strong id="autoSerieEjemplo">${esc(_generarPrefijo(a.equipo || tipoActivo))}00001</strong></p>
        </div>
      </div>` : '';

  openModal(
    `Series — ${esc(a.codigo)}`,
    `<div>
      ${ramAlmHTML}
      ${autoSerieHTML}
      <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:16px" id="serieManualRow">
        <div style="flex:1">
          <label style="font-size:12px;font-weight:500;color:var(--text);display:block;margin-bottom:4px">N° Serie ${esAccesorio ? '' : '<span style="color:var(--danger)">*</span>'}</label>
          <input class="form-control" id="fNuevaSerie" placeholder="N° de serie" onkeydown="if(event.key==='Enter')addSerie(${activoId})">
        </div>
        <div style="flex:1">
          <label style="font-size:12px;font-weight:500;color:var(--text);display:block;margin-bottom:4px">Cod. Inventario</label>
          <input class="form-control" id="fNuevaCodInv" placeholder="Opcional" onkeydown="if(event.key==='Enter')addSerie(${activoId})">
        </div>
        <button class="btn btn-primary" onclick="addSerie(${activoId})" style="height:38px;width:38px;padding:0;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700" title="Agregar serie">+</button>
      </div>
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Series registradas (${series.length})</div>
      <div id="seriesList">${_renderSeriesList(series, activoId)}</div>
    </div>`,
    `<button class="btn btn-secondary" onclick="cancelarSeries()">Cancelar</button>
     <button class="btn btn-primary" onclick="guardarSeries()">Guardar</button>`
  );
  setTimeout(() => { const el = document.getElementById('fNuevaSerie'); if (el) el.focus(); }, 80);
}

function _generarPrefijo(equipo) {
  if (!equipo) return 'ACC';
  const palabras = equipo.trim().toUpperCase().split(/\s+/);
  if (palabras.length === 1) {
    return palabras[0].substring(0, 3);
  }
  return palabras.map(p => p.charAt(0)).join('').substring(0, 4);
}

function toggleAutoSerie(activoId) {
  const chk = document.getElementById('fAutoSerie');
  const preview = document.getElementById('autoSeriePreview');
  if (!chk || !preview) return;
  preview.style.display = chk.checked ? 'block' : 'none';
}

function generarSeriesAuto(activoId) {
  const cant = parseInt(document.getElementById('fAutoSerieCant').value) || 0;
  if (cant < 1 || cant > 500) { showToast('Ingresa una cantidad entre 1 y 500', 'error'); return; }

  const activos = DB.get('activos');
  const idx = activos.findIndex(a => a.id === activoId);
  if (idx < 0) return;
  const a = activos[idx];
  if (!a.series) a.series = [];

  const prefijo = _generarPrefijo(a.equipo || a.tipo);
  // Buscar el número más alto existente con este prefijo
  let maxNum = 0;
  a.series.forEach(s => {
    const n = _normalizeSerie(s);
    if (n.serie.toUpperCase().startsWith(prefijo)) {
      const num = parseInt(n.serie.substring(prefijo.length)) || 0;
      if (num > maxNum) maxNum = num;
    }
  });

  for (let i = 1; i <= cant; i++) {
    a.series.push({
      serie: prefijo + String(maxNum + i).padStart(5, '0'),
      codInventario: '',
      ram: '',
      almacenamiento: ''
    });
  }

  DB.set('activos', activos);
  _seriesPage = Math.ceil(a.series.length / SERIES_PAGE_SIZE);
  document.getElementById('seriesList').innerHTML = _renderSeriesList(a.series, activoId);

  // Actualizar contador
  const counter = document.querySelector('[id="seriesList"]').previousElementSibling;
  if (counter) counter.textContent = 'Series registradas (' + a.series.length + ')';

  showToast(cant + ' series generadas con prefijo ' + prefijo);
}

function cancelarSeries() {
  if (_seriesBackup !== null && _seriesBackupId !== null) {
    const activos = DB.get('activos');
    const idx = activos.findIndex(a => a.id === _seriesBackupId);
    if (idx >= 0) {
      activos[idx].series = _seriesBackup;
      DB.set('activos', activos);
    }
  }
  _seriesBackup = null;
  _seriesBackupId = null;
  closeModal();
  _renderIngresoTable();
}

function guardarSeries() {
  _seriesBackup = null;
  _seriesBackupId = null;
  closeModal();
  showToast('Series guardadas');
  _renderIngresoTable();
}

function _normalizeSerie(s) {
  if (typeof s === 'string') return { serie: s, ram: '', almacenamiento: '', codInventario: '' };
  return s;
}

let _seriesPage = 1;
const SERIES_PAGE_SIZE = 5;

function goSeriesPage(activoId, p) {
  _seriesPage = p;
  const activos = DB.get('activos');
  const a = activos.find(x => x.id === activoId);
  if (!a) return;
  document.getElementById('seriesList').innerHTML = _renderSeriesList(a.series || [], activoId);
}

function _renderSeriesList(series, activoId) {
  if (!series || series.length === 0)
    return '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0">Sin series registradas.</p>';

  const activos = DB.get('activos');
  const activo = activos.find(x => x.id === activoId);
  const showRamAlm = activo && _esTipoConSpecs(activo.tipo);

  const total = series.length;
  const tp = Math.max(1, Math.ceil(total / SERIES_PAGE_SIZE));
  if (_seriesPage > tp) _seriesPage = tp;
  const p = _seriesPage;
  const start = (p - 1) * SERIES_PAGE_SIZE;
  const slice = series.slice(start, start + SERIES_PAGE_SIZE);

  const rows = slice.map((raw, i) => {
    const idx = start + i;
    const s = _normalizeSerie(raw);
    return `<tr>
      <td style="font-family:monospace;font-weight:700;font-size:12px">${esc(s.serie)}</td>
      <td style="font-size:12px">${esc(s.codInventario || '—')}</td>
      ${showRamAlm ? `<td style="font-size:12px">${s.ram ? `<span class="badge badge-info" style="font-size:10px">${esc(s.ram)}</span>` : '—'}</td>
      <td style="font-size:12px">${s.almacenamiento ? `<span class="badge badge-purple" style="font-size:10px">${esc(s.almacenamiento)}</span>` : '—'}</td>` : ''}
      <td><button class="btn-icon" style="width:26px;height:26px;border:none" onclick="removeSerie(${activoId},${idx})" title="Eliminar">🗑️</button></td>
    </tr>`;
  }).join('');

  const paginacion = tp > 1 ? `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 4px 0;font-size:12px;color:var(--text-muted)">
      <span>${start + 1}–${Math.min(start + SERIES_PAGE_SIZE, total)} de ${total}</span>
      <div style="display:flex;gap:4px">
        <button class="btn-icon" style="width:26px;height:26px;font-size:12px;border:none" ${p === 1 ? 'disabled' : ''} onclick="goSeriesPage(${activoId},${p - 1})">‹</button>
        ${Array.from({length: tp}, (_, i) => i + 1).map(n =>
          `<button class="btn-icon" style="width:26px;height:26px;font-size:11px;border:none;${n === p ? 'background:var(--accent);color:#fff;border-radius:6px' : ''}" onclick="goSeriesPage(${activoId},${n})">${n}</button>`
        ).join('')}
        <button class="btn-icon" style="width:26px;height:26px;font-size:12px;border:none" ${p === tp ? 'disabled' : ''} onclick="goSeriesPage(${activoId},${p + 1})">›</button>
      </div>
    </div>` : '';

  return `
    <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead style="background:#f8fafc;border-bottom:1px solid var(--border)">
          <tr>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.3px">Serie</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.3px">Cod. Inv.</th>
            ${showRamAlm ? `<th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.3px">RAM</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.3px">Disco</th>` : ''}
            <th style="padding:8px 12px;width:36px"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${paginacion}
    </div>`;
}

function addSerie(activoId) {
  const serieInput = document.getElementById('fNuevaSerie');
  const codInvInput = document.getElementById('fNuevaCodInv');
  const ramSelect = document.getElementById('fNuevaRAM');
  const almSelect = document.getElementById('fNuevaAlm');

  const serie = serieInput ? serieInput.value.trim() : '';
  if (!serie) { showToast('Ingresa un número de serie', 'error'); return; }

  const activos = DB.get('activos');
  const idx = activos.findIndex(a => a.id === activoId);
  if (idx < 0) return;
  if (!activos[idx].series) activos[idx].series = [];

  const existentes = activos[idx].series.map(s => {
    const n = _normalizeSerie(s);
    return n.serie.toLowerCase();
  });
  if (existentes.includes(serie.toLowerCase())) {
    showToast('La serie ya está registrada', 'error'); return;
  }

  activos[idx].series.push(upperFields({
    serie,
    codInventario: codInvInput ? codInvInput.value.trim() : '',
    ram: ramSelect ? ramSelect.value : '',
    almacenamiento: almSelect ? almSelect.value : ''
  }));
  DB.set('activos', activos);
  _seriesPage = Math.ceil(activos[idx].series.length / SERIES_PAGE_SIZE);
  document.getElementById('seriesList').innerHTML = _renderSeriesList(activos[idx].series, activoId);

  // Solo limpiar serie y cod inventario — RAM y almacenamiento se mantienen
  serieInput.value = '';
  if (codInvInput) codInvInput.value = '';
  serieInput.focus();
  showToast('Serie agregada');
}

function removeSerie(activoId, serieIdx) {
  if (!confirm('¿Eliminar esta serie?')) return;
  const activos = DB.get('activos');
  const idx = activos.findIndex(a => a.id === activoId);
  if (idx < 0) return;
  activos[idx].series.splice(serieIdx, 1);
  DB.set('activos', activos);
  document.getElementById('seriesList').innerHTML = _renderSeriesList(activos[idx].series, activoId);
  showToast('Serie eliminada');
}

/* ═══════════════════════════════════════════════════════
   COLABORADORES - PADRON
   ═══════════════════════════════════════════════════════ */
let padronSearch = '';
let padronFilterArea = 'Todos';
let padronFilterEstado = 'Todos';

function renderPadron(el) {
  const colabs = DB.get('colaboradores');
  const estados = ['Todos', 'Activo', 'Cesado'];

  const totalActivos = colabs.filter(c => c.estado === 'Activo').length;
  const totalCesados = colabs.filter(c => c.estado === 'Cesado').length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Padrón de Colaboradores</h1>
        <div class="subtitle">Directorio general de todos los colaboradores</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="openCargaMasivaColabModal()" style="font-size:13px">📥 Carga Masiva</button>
        <button class="btn btn-primary" onclick="openColabModal()">+ Nuevo Colaborador</button>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon blue">👥</div></div>
        <div class="stat-value">${colabs.length}</div>
        <div class="stat-label">Total colaboradores</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">✅</div></div>
        <div class="stat-value">${totalActivos}</div>
        <div class="stat-label">Activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon red">⛔</div></div>
        <div class="stat-value">${totalCesados}</div>
        <div class="stat-label">Cesados</div>
      </div>
    </div>

    <div class="table-toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="padronSearchInput" placeholder="Buscar por nombre, DNI, email, cargo, ubicación..."
               value="${esc(padronSearch)}"
               oninput="_onPadronSearch(this.value)">
      </div>
      <div class="filter-chips">
        ${estados.map(e => `
          <span class="filter-chip ${padronFilterEstado === e ? 'active' : ''}"
                onclick="padronFilterEstado='${e}';resetPage('padron');_renderPadronTable()">
            ${e}
          </span>
        `).join('')}
      </div>
    </div>


    <div id="padronTableWrap"></div>
  `;
  _renderPadronTable();
}

let _padronSearchTimer = null;
let padronFilterPerfil = 'Todos';
function _onPadronSearch(val) {
  padronSearch = val;
  resetPage('padron');
  clearTimeout(_padronSearchTimer);
  _padronSearchTimer = setTimeout(_renderPadronTable, 120);
}

function _renderPadronTable() {
  const wrap = document.getElementById('padronTableWrap');
  if (!wrap) return;
  const colabs = DB.get('colaboradores');

  const filtered = colabs.filter(c => {
    if (padronFilterArea !== 'Todos' && c.area !== padronFilterArea) return false;
    if (padronFilterEstado !== 'Todos' && c.estado !== padronFilterEstado) return false;
    if (padronFilterPerfil !== 'Todos' && (c.perfil || '') !== padronFilterPerfil) return false;
    if (padronSearch) {
      const s = padronSearch.toLowerCase();
      return (c.nombre || '').toLowerCase().includes(s) ||
             (c.dni || '').toLowerCase().includes(s) ||
             (c.email || '').toLowerCase().includes(s) ||
             (c.cargo || '').toLowerCase().includes(s) ||
             (c.telefono || '').toLowerCase().includes(s) ||
             (c.perfil || '').toLowerCase().includes(s) ||
             (c.ubicacion || '').toLowerCase().includes(s) ||
             (c.tipoPuesto || '').toLowerCase().includes(s);
    }
    return true;
  });

  wrap.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>DNI</th>
              <th>Perfil</th>
              <th>Área</th>
              <th>Ubicación</th>
              <th>Tipo Puesto</th>
              <th>Teléfono</th>
              <th>Cargo</th>
              <th>Estado</th>
              <th>F. Ingreso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? '<tr><td colspan="13"><div class="empty-state"><div class="empty-icon">👥</div><h3>Sin resultados</h3><p>No se encontraron colaboradores</p></div></td></tr>'
              : pagSlice(filtered, 'padron').map(c => {
                  const perfilBadge = c.perfil === 'Empleado' ? 'badge-info' : c.perfil === 'Practicante' ? 'badge-warning' : c.perfil === 'Externo' ? 'badge-purple' : c.perfil === 'Intermediario' ? 'badge-success' : '';
                  return `
                    <tr>
                      <td style="font-size:12px;color:var(--text-light)">${c.id}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px">
                          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">
                            ${esc((c.nombre || '').split(' ').map(p => p[0]).slice(0, 2).join(''))}
                          </div>
                          <strong>${esc(c.nombre)}</strong>
                        </div>
                      </td>
                      <td style="font-size:12px">${esc(c.email || '—')}</td>
                      <td style="font-family:monospace;font-size:12px">${esc(c.dni)}</td>
                      <td>${c.perfil ? `<span class="badge ${perfilBadge}" style="font-size:10px">${esc(c.perfil)}</span>` : '—'}</td>
                      <td style="font-size:12px">${esc(c.area || '—')}</td>
                      <td style="font-size:12px">${esc(c.ubicacion || '—')}</td>
                      <td style="font-size:12px">${esc(c.tipoPuesto || '—')}</td>
                      <td style="font-size:12px">${esc(c.telefono || '—')}</td>
                      <td style="font-size:12px">${esc(c.cargo || '—')}</td>
                      <td>
                        ${c.estado === 'Activo'
                          ? '<span class="badge badge-success" style="font-size:10px">Activo</span>'
                          : c.fechaCese && c.fechaCese > today()
                            ? '<span class="badge badge-warning" style="font-size:10px">Próximo Cese</span>'
                            : '<span class="badge badge-danger" style="font-size:10px">Cesado</span>'
                        }
                      </td>
                      <td style="font-size:12px">${formatDate(c.fechaIngreso)}</td>
                      <td>
                        <div class="action-btns">
                          <button class="btn-icon" title="Ver detalle" onclick="verColaborador(${c.id})">👁️</button>
                          <button class="btn-icon" title="Editar" onclick="openColabModal(${c.id})">✏️</button>
                          ${c.estado === 'Activo' ? `<button class="btn-icon" title="Cesar colaborador" onclick="openCeseModal(${c.id})" style="background:#fef9c3;color:#a16207;border:1px solid #fde68a">⛔</button>` : ''}
                          <button class="btn-icon" title="Eliminar" onclick="deleteColab(${c.id})" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        ${pagFooter('padron', filtered.length)}
      </div>
    </div>
  `;
}

function verColaborador(id) {
  const colabs = DB.get('colaboradores');
  const c = colabs.find(x => x.id === id);
  if (!c) return;

  const asignaciones = DB.get('asignaciones').filter(a => a.colaboradorId === id);
  const activos = DB.get('activos');
  const vigentes = asignaciones.filter(a => a.estado === 'Vigente');

  const perfilBadge = c.perfil === 'Empleado' ? 'badge-info' : c.perfil === 'Practicante' ? 'badge-warning' : c.perfil === 'Externo' ? 'badge-purple' : c.perfil === 'Intermediario' ? 'badge-success' : '';

  openModal('Detalle de Colaborador', `
    <div style="display:flex;flex-direction:column;gap:20px">
      <div style="display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700;flex-shrink:0">
          ${esc((c.nombre || '').split(' ').map(p => p[0]).slice(0, 2).join(''))}
        </div>
        <div>
          <h3 style="margin:0;font-size:18px">${esc(c.nombre)}</h3>
          <div style="font-size:13px;color:var(--text-muted)">${esc(c.cargo || 'Sin cargo')} — ${esc(c.area || 'Sin área')}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px">
          <span class="badge ${c.estado === 'Activo' ? 'badge-success' : 'badge-danger'}">${esc(c.estado)}</span>
          ${c.perfil ? `<span class="badge ${perfilBadge}">${esc(c.perfil)}</span>` : ''}
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">DNI</label>
          <div style="font-family:monospace;font-size:14px">${esc(c.dni)}</div>
        </div>
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Email</label>
          <div style="font-size:14px">${esc(c.email || '—')}</div>
        </div>
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Teléfono</label>
          <div style="font-size:14px">${esc(c.telefono || '—')}</div>
        </div>
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Ubicación</label>
          <div style="font-size:14px">${esc(c.ubicacion || '—')}</div>
        </div>
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Tipo de Puesto</label>
          <div style="font-size:14px">${esc(c.tipoPuesto || '—')}</div>
        </div>
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Fecha Ingreso</label>
          <div style="font-size:14px">${formatDate(c.fechaIngreso)}</div>
        </div>
        ${c.fechaCese ? `
        <div class="form-group">
          <label style="font-size:11px;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Fecha de Cese</label>
          <div style="font-size:14px;color:#dc2626;font-weight:600">${formatDate(c.fechaCese)}</div>
        </div>
        ` : ''}
      </div>

      <div style="border-top:1px solid var(--border);padding-top:16px">
        <h4 style="margin:0 0 12px 0;font-size:14px;display:flex;align-items:center;gap:8px">
          📦 Activos Asignados
          <span class="badge badge-info" style="font-size:10px">${vigentes.length}</span>
        </h4>
        ${vigentes.length === 0
          ? '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px">No tiene activos asignados actualmente</div>'
          : `<table style="width:100%;font-size:12px">
              <thead><tr><th>Código</th><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Serie</th><th>Fecha Asign.</th></tr></thead>
              <tbody>
                ${vigentes.map(a => {
                  const act = activos.find(x => x.id === a.activoId);
                  return `<tr>
                    <td style="font-family:monospace">${act ? esc(act.codigo) : '—'}</td>
                    <td>${act ? esc(act.tipo) : '—'}</td>
                    <td>${act ? esc(act.marca) : '—'}</td>
                    <td>${act ? esc(act.modelo) : '—'}</td>
                    <td style="font-family:monospace;font-size:11px">${esc(a.serieAsignada || '—')}</td>
                    <td>${formatDate(a.fechaAsignacion)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
        }
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `);
}

/* ═══════════════════════════════════════════════════════
   COLABORADORES - CARGA MASIVA PADRON
   ═══════════════════════════════════════════════════════ */
const _CMP_COLUMNS = [
  { excel: 'NOMBRE',        field: 'nombre',     required: true },
  { excel: 'DNI',            field: 'dni',         required: true },
  { excel: 'EMAIL',          field: 'email' },
  { excel: 'TELEFONO',       field: 'telefono' },
  { excel: 'PERFIL',         field: 'perfil',      required: true },
  { excel: 'AREA',           field: 'area' },
  { excel: 'UBICACION',      field: 'ubicacion' },
  { excel: 'TIPO_PUESTO',    field: 'tipoPuesto' },
  { excel: 'CARGO',          field: 'cargo' },
  { excel: 'ESTADO',         field: 'estado' },
  { excel: 'FECHA_INGRESO',  field: 'fechaIngreso' }
];

let _cargaMasivaColabData = [];
let _cargaMasivaColabPage = 1;
const _CMP_PAGE_SIZE = 50;

function openCargaMasivaColabModal() {
  _cargaMasivaColabData = [];
  _cargaMasivaColabPage = 1;
  openModal('Carga Masiva de Colaboradores', `
    <div id="cmpContainer">
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:12px">📥</div>
        <p style="color:var(--text);font-weight:600;margin-bottom:4px">Importar colaboradores desde Excel</p>
        <p style="color:var(--text-light);font-size:13px;margin-bottom:20px">Sube un archivo .xlsx o .xls con los datos de los colaboradores</p>
        <div style="display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap">
          <label style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:var(--primary);color:#fff;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500">
            📂 Seleccionar archivo
            <input type="file" id="cmpFileInput" accept=".xlsx,.xls" style="display:none" onchange="procesarExcelColab(this.files[0])">
          </label>
          <button class="btn" onclick="descargarPlantillaColab()" style="font-size:13px">📋 Descargar Plantilla</button>
        </div>
        <p style="font-size:11px;color:var(--text-light);margin-top:12px">Descarga la plantilla para ver el formato correcto de columnas</p>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
}

function descargarPlantillaColab() {
  const headers = _CMP_COLUMNS.map(c => c.excel);
  const ejemplo = [
    'Juan Pérez', '12345678', 'juan.perez@empresa.com', '987654321',
    'Empleado', 'TI', 'Sede Central', 'Presencial', 'Analista', 'Activo', '15/01/2026'
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
  XLSX.writeFile(wb, 'Plantilla_Carga_Colaboradores.xlsx');
  showToast('Plantilla descargada');
}

function procesarExcelColab(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        showToast('El archivo está vacío', 'error');
        return;
      }

      const perfilesValidos = ['EMPLEADO', 'PRACTICANTE', 'EXTERNO', 'INTERMEDIARIO'];

      _cargaMasivaColabData = rows.map((row, i) => {
        const mapped = {};
        const rowKeys = Object.keys(row);
        _CMP_COLUMNS.forEach(col => {
          const matchKey = rowKeys.find(k => k.toUpperCase().replace(/\s+/g, '_') === col.excel.toUpperCase()) || col.excel;
          let val = row[matchKey];
          if (val === undefined || val === null) val = '';
          mapped[col.field] = (val instanceof Date) ? normalizeDate(val) : String(val).trim();
        });
        // Normalizar fechas
        if (mapped.fechaIngreso) mapped.fechaIngreso = normalizeDate(mapped.fechaIngreso);
        // Convertir a mayúsculas
        Object.keys(mapped).forEach(k => { if (typeof mapped[k] === 'string' && !_SKIP_UPPER.includes(k)) mapped[k] = mapped[k].toUpperCase(); });
        const errors = [];
        if (!mapped.nombre) errors.push('NOMBRE');
        if (!mapped.dni) errors.push('DNI');
        if (!mapped.perfil) errors.push('PERFIL');
        else if (!perfilesValidos.includes(mapped.perfil)) errors.push('PERFIL (valor inválido)');
        return { ...mapped, _row: i + 2, _errors: errors, _valid: errors.length === 0 };
      });

      _cargaMasivaColabPage = 1;
      _renderCargaMasivaColabPreview();
    } catch (err) {
      showToast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function _renderCargaMasivaColabPreview() {
  const container = document.getElementById('cmpContainer');
  if (!container) return;

  const total = _cargaMasivaColabData.length;
  const validos = _cargaMasivaColabData.filter(r => r._valid).length;
  const errores = total - validos;

  const tp = Math.max(1, Math.ceil(total / _CMP_PAGE_SIZE));
  if (_cargaMasivaColabPage > tp) _cargaMasivaColabPage = tp;
  const start = (_cargaMasivaColabPage - 1) * _CMP_PAGE_SIZE;
  const pageData = _cargaMasivaColabData.slice(start, start + _CMP_PAGE_SIZE);

  container.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#f0fdf4;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#16a34a">${validos}</div>
        <div style="font-size:11px;color:#15803d">Válidos</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:${errores > 0 ? '#fef2f2' : '#f8fafc'};border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:${errores > 0 ? '#dc2626' : '#94a3b8'}">${errores}</div>
        <div style="font-size:11px;color:${errores > 0 ? '#b91c1c' : '#64748b'}">Con errores</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#f8fafc;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#334155">${total}</div>
        <div style="font-size:11px;color:#64748b">Total filas</div>
      </div>
    </div>

    ${errores > 0 ? '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#991b1b">⚠️ Las filas con error (campos obligatorios: NOMBRE, DNI, PERFIL) no se importarán. PERFIL debe ser: Empleado, Practicante o Externo.</div>' : ''}

    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;font-size:12px">
        <thead>
          <tr>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">#</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Nombre *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">DNI *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Email</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Teléfono</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Perfil *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Área</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Ubicación</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Tipo Puesto</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Cargo</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Estado</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary);text-align:center">✓</th>
          </tr>
        </thead>
        <tbody>
          ${pageData.map(r => `
            <tr style="${r._valid ? '' : 'background:#fef2f2'}">
              <td style="padding:6px;color:var(--text-light)">${r._row}</td>
              <td style="padding:6px;${!r.nombre ? 'color:#dc2626;font-weight:600' : ''}">${esc(r.nombre || '⚠ vacío')}</td>
              <td style="padding:6px;font-family:monospace;${!r.dni ? 'color:#dc2626;font-weight:600' : ''}">${esc(r.dni || '⚠ vacío')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.email || '—')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.telefono || '—')}</td>
              <td style="padding:6px;${!r.perfil || r._errors.some(e => e.startsWith('PERFIL')) ? 'color:#dc2626;font-weight:600' : ''}">${esc(r.perfil || '⚠ vacío')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.area || '—')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.ubicacion || '—')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.tipoPuesto || '—')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.cargo || '—')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.estado || '—')}</td>
              <td style="padding:6px;text-align:center">${r._valid ? '<span style="color:#16a34a">✓</span>' : '<span style="color:#dc2626" title="Faltan: '+r._errors.join(', ')+'">✗</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${tp > 1 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;color:var(--text-light)">
        <span>Mostrando ${start + 1}–${Math.min(start + _CMP_PAGE_SIZE, total)} de ${total}</span>
        <div style="display:flex;gap:4px">
          ${_cargaMasivaColabPage > 1 ? '<button class="btn btn-sm" onclick="_cargaMasivaColabPage--;_renderCargaMasivaColabPreview()" style="font-size:11px;padding:3px 8px">‹ Ant</button>' : ''}
          <span style="padding:3px 8px;font-weight:600">${_cargaMasivaColabPage} / ${tp}</span>
          ${_cargaMasivaColabPage < tp ? '<button class="btn btn-sm" onclick="_cargaMasivaColabPage++;_renderCargaMasivaColabPreview()" style="font-size:11px;padding:3px 8px">Sig ›</button>' : ''}
        </div>
      </div>
    ` : ''}

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
      <label style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-light)">
        📂 Cambiar archivo
        <input type="file" accept=".xlsx,.xls" style="display:none" onchange="procesarExcelColab(this.files[0])">
      </label>
      ${validos > 0 ? `<button class="btn btn-primary" onclick="ejecutarCargaMasivaColab()" style="font-size:13px">📥 Importar ${validos} colaborador${validos > 1 ? 'es' : ''}</button>` : ''}
    </div>
  `;

  const footer = document.getElementById('modalFooter');
  if (footer) footer.innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>';
}

function ejecutarCargaMasivaColab() {
  const validos = _cargaMasivaColabData.filter(r => r._valid);
  if (validos.length === 0) { showToast('No hay registros válidos para importar', 'error'); return; }

  if (!confirm('¿Importar ' + validos.length + ' colaboradores?')) return;

  const colabs = DB.get('colaboradores');
  let id = nextId(colabs);

  validos.forEach(r => {
    colabs.push({
      id: id++,
      nombre: r.nombre,
      dni: r.dni,
      email: r.email || '',
      telefono: r.telefono || '',
      perfil: r.perfil,
      area: r.area || '',
      ubicacion: r.ubicacion || '',
      tipoPuesto: r.tipoPuesto || '',
      cargo: r.cargo || '',
      estado: r.estado || 'Activo',
      fechaIngreso: r.fechaIngreso || today()
    });
  });

  DB.set('colaboradores', colabs);
  addMovimiento('Carga Masiva Colaboradores', `Se importaron ${validos.length} colaboradores desde Excel`);
  closeModal();
  showToast(`${validos.length} colaboradores importados correctamente`);
  renderPadron(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   COLABORADORES - ASIGNACION
   ═══════════════════════════════════════════════════════ */
let asigSearch = '';
let _asigSearchTimer = null;
let _asigSelectedColab = null;
let _asigSelectedActivos = [];

function renderAsignacion(el) {
  const asig = DB.get('asignaciones');
  const vigentes = asig.filter(a => a.estado === 'Vigente').length;
  const devueltos = asig.filter(a => a.estado === 'Devuelto').length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Asignación de Activos</h1>
        <div class="subtitle">Gestión de asignaciones de equipos a colaboradores</div>
      </div>
      <button class="btn btn-primary" onclick="openAsignacionModal()">+ Nueva Asignación</button>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon blue">🔗</div></div>
        <div class="stat-value">${asig.length}</div>
        <div class="stat-label">Total asignaciones</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">✅</div></div>
        <div class="stat-value">${vigentes}</div>
        <div class="stat-label">Vigentes</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon" style="background:#f1f5f9;color:#64748b">↩️</div></div>
        <div class="stat-value">${devueltos}</div>
        <div class="stat-label">Devueltos</div>
      </div>
    </div>

    <div class="table-toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="asigSearchInput" placeholder="Buscar por colaborador, activo, ticket..."
               value="${esc(asigSearch)}"
               oninput="_onAsigSearch(this.value)">
      </div>
    </div>

    <div id="asigTableWrap"></div>
  `;
  _renderAsigTable();
}

function _onAsigSearch(val) {
  asigSearch = val;
  resetPage('asignacion');
  clearTimeout(_asigSearchTimer);
  _asigSearchTimer = setTimeout(_renderAsigTable, 120);
}

function _groupAsignaciones(asigList) {
  const groups = {};
  asigList.forEach(a => {
    const key = a.ticket + '|' + a.colaboradorId + '|' + a.fechaAsignacion;
    if (!groups[key]) {
      groups[key] = {
        id: a.id,
        fechaAsignacion: a.fechaAsignacion,
        ticket: a.ticket,
        colaboradorNombre: a.colaboradorNombre,
        colaboradorId: a.colaboradorId,
        correoColab: a.correoColab || '',
        motivo: a.tipoAsignacion || a.motivo || '',
        estado: a.estado,
        items: []
      };
    }
    groups[key].items.push(a);
    if (a.id < groups[key].id) groups[key].id = a.id;
  });
  return Object.values(groups).sort((a, b) => b.id - a.id);
}

function _renderAsigTable() {
  const wrap = document.getElementById('asigTableWrap');
  if (!wrap) return;
  const asig = DB.get('asignaciones');

  const filtered = asig.filter(a => {
    if (!asigSearch) return true;
    const s = asigSearch.toLowerCase();
    return (a.colaboradorNombre || '').toLowerCase().includes(s) ||
           (a.correoColab || '').toLowerCase().includes(s) ||
           (a.ticket || '').toLowerCase().includes(s) ||
           (a.tipoAsignacion || '').toLowerCase().includes(s) ||
           (a.motivo || '').toLowerCase().includes(s) ||
           (a.area || '').toLowerCase().includes(s);
  });

  const grouped = _groupAsignaciones(filtered);

  wrap.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Correo</th>
              <th>Motivo</th>
              <th>Ticket</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${grouped.length === 0
              ? '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🔗</div><h3>Sin asignaciones</h3><p>No hay asignaciones registradas</p></div></td></tr>'
              : pagSlice(grouped, 'asignacion').map(g => `
                  <tr>
                    <td style="font-size:12px;color:var(--text-light)">${g.id}</td>
                    <td style="font-size:12px;white-space:nowrap">${formatDateTime(g.fechaAsignacion)}</td>
                    <td style="font-size:11px">${esc(g.correoColab || '—')}</td>
                    <td><span class="badge badge-info" style="font-size:10px">${esc(g.motivo || '—')}</span></td>
                    <td style="font-size:11px;font-family:monospace">${esc(g.ticket || '—')}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-icon" title="Ver detalle" onclick="verDetalleAsignacion('${esc(g.ticket)}',${g.colaboradorId},'${esc(g.fechaAsignacion)}')" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe">👁️</button>
                        <button class="btn-icon" title="Acta de Entrega" onclick="previewActaEntrega(${g.items[0].id})" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0">📄</button>
                        <button class="btn-icon" title="Eliminar" onclick="deleteAsignacionGrupo('${esc(g.ticket)}',${g.colaboradorId},'${esc(g.fechaAsignacion)}')" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">${pagFooter('asignacion', grouped.length)}</div>
    </div>
  `;
}

let _asigStockSearch = '';
let _asigStockTipo = 'Todos';
let _asigStockAlmacen = 'Todos';
let _asigStockPage = 0;
const _ASIG_PAGE_SIZE = 5;
// Accesorios para Ingreso Nuevo
let _asigAccSearch = '';
let _asigAccTipo = 'Todos';
let _asigAccPage = 0;
let _asigSelectedAccesorios = [];
const _TIPOS_EP_ADMIN = ['LAPTOP', 'DESKTOP'];
let _asigFecha = '';
let _asigTicket = '';
let _asigObs = '';
let _asigMotivo = '';
let _asigFechaPrestamo = '';
let _asigReemOld = null; // asignación seleccionada para reemplazo

function openAsignacionModal() {
  _asigSelectedColab = null;
  _asigSelectedActivos = [];
  _asigSelectedAccesorios = [];
  _asigStockSearch = '';
  _asigStockTipo = 'Todos';
  _asigStockAlmacen = 'Todos';
  _asigStockPage = 0;
  _asigAccSearch = '';
  _asigAccTipo = 'Todos';
  _asigAccPage = 0;
  _asigFecha = today();
  _asigTicket = '';
  _asigObs = '';
  _asigFechaPrestamo = '';
  _asigMotivo = '';
  _asigReemOld = null;
  _renderAsignacionModal(true);
}

function _renderAsignacionModal(fresh) {
  // Preserve form values before re-render (skip if fresh open)
  if (!fresh) {
    const elFecha = document.getElementById('fAsigFecha');
    const elTicket = document.getElementById('fAsigTicket');
    const elObs = document.getElementById('fAsigObs');
    const elMotivo = document.getElementById('fAsigMotivo');
    if (elFecha) _asigFecha = elFecha.value;
    if (elTicket) _asigTicket = elTicket.value;
    if (elObs) _asigObs = elObs.value;
    if (elMotivo) _asigMotivo = elMotivo.value;
    const elFechaPrest = document.getElementById('fAsigFechaPrestamo');
    if (elFechaPrest) _asigFechaPrestamo = elFechaPrest.value;
  }

  const c = _asigSelectedColab;
  const motivosAsig = ['INGRESO NUEVO','REEMPLAZO','ASIGNACIÓN','PRÉSTAMO','RENOVACIÓN','REPOSICIÓN DAÑO FÍSICO','REPOSICIÓN ROBO'];
  const motVal = _asigMotivo || '';
  const _motUp = motVal.toUpperCase();
  const isReposicionDano = _motUp.includes('REPOSICIÓN DAÑO FÍSICO') || _motUp.includes('REPOSICION DANO FISICO');
  const isReposicionRobo = _motUp.includes('REPOSICIÓN ROBO') || _motUp.includes('REPOSICION ROBO');
  const isReemplazo = _motUp.includes('REEMPLAZO') || _motUp.includes('RENOVACIÓN') || _motUp.includes('RENOVACION') || isReposicionDano || isReposicionRobo;
  const isRenovacion = _motUp.includes('RENOVACIÓN') || _motUp.includes('RENOVACION');
  const isPrestamo = _motUp.includes('PRÉSTAMO') || _motUp.includes('PRESTAMO');
  const isIngresoNuevo = _motUp.includes('INGRESO NUEVO');

  // Para Ingreso Nuevo: obtener IDs de colaboradores que ya tienen equipo principal (LAPTOP/DESKTOP)
  let _colabsConEquipo = new Set();
  if (isIngresoNuevo) {
    const _asigAll = DB.get('asignaciones');
    _asigAll.filter(a => a.estado === 'Vigente' && ['LAPTOP','DESKTOP'].includes((a.activoTipo || '').toUpperCase()))
      .forEach(a => _colabsConEquipo.add(a.colaboradorId));
  }
  window._asigColabsConEquipo = _colabsConEquipo;
  window._asigIsIngresoNuevo = isIngresoNuevo;

  // Build inline stock table
  const activos = DB.get('activos');
  const asignaciones = DB.get('asignaciones');
  const seriesAsig = new Set(asignaciones.filter(a => a.estado === 'Vigente').map(a => a.activoId + '||' + (a.serieAsignada||'').toUpperCase().trim()));

  // ── Reemplazo: equipos asignados al colaborador ──
  let reemAsigHTML = '';
  let reemTipoFiltro = '';
  let _reemHasLaptop = false;
  if (isReemplazo && c) {
    const userAsigs = asignaciones.filter(a => a.colaboradorId === c.id && a.estado === 'Vigente');
    if (userAsigs.length === 0) {
      reemAsigHTML = '<div style="padding:16px;text-align:center;color:#dc2626;font-size:12px;background:#fef2f2;border-radius:8px">Este colaborador no tiene activos asignados para reemplazar.</div>';
    } else {
      _reemHasLaptop = userAsigs.some(a => { const ax = activos.find(x => x.id === a.activoId); return ax && (ax.tipo||'').toUpperCase() === 'LAPTOP'; });
      reemAsigHTML = userAsigs.map(a => {
        const act = activos.find(x => x.id === a.activoId);
        const sel = _asigReemOld && _asigReemOld.id === a.id;
        const esLaptop = act && (act.tipo||'').toUpperCase() === 'LAPTOP';
        return `<tr onclick="_asigSelectReemOld(${a.id})" style="cursor:pointer;background:${sel ? '#fef3c7' : ''};border-bottom:1px solid #f1f5f9"
          onmouseover="if(!this.style.background.includes('fef3c7'))this.style.background='#f8fafc'" onmouseout="if(!this.style.background.includes('fef3c7'))this.style.background=''">
          <td style="padding:6px;text-align:center">
            <input type="radio" name="reemOld" ${sel ? 'checked' : ''} onclick="event.stopPropagation();_asigSelectReemOld(${a.id})">
          </td>
          <td style="padding:6px 8px;font-family:monospace;font-size:11px;font-weight:700">${act ? esc(act.codigo) : '—'}</td>
          <td style="padding:6px 8px;font-size:11px">${act ? esc(act.equipo || act.tipo) : '—'}</td>
          <td style="padding:6px 8px">${act ? esc(act.marca) + ' ' + esc(act.modelo) : '—'}</td>
          <td style="padding:6px 8px;font-family:monospace;font-size:11px">${esc(a.serieAsignada || '—')}</td>
          ${_reemHasLaptop ? `<td style="padding:6px 8px;font-size:11px;color:#64748b">${esLaptop ? esc(act.gama || '—') : '—'}</td>` : ''}
        </tr>`;
      }).join('');
    }
    // Si hay equipo seleccionado, filtrar stock por mismo tipo
    if (_asigReemOld) {
      const oldAct = activos.find(x => x.id === _asigReemOld.activoId);
      reemTipoFiltro = oldAct ? (oldAct.tipo || '').toUpperCase().trim() : '';
    }
  }

  // ── Stock disponible ──
  const stock = [];
  activos.forEach(a => {
    const e = (a.estado||'').toUpperCase();
    if (e === 'BAJA' || e === 'NO RECUPERABLE' || e === 'DADO DE BAJA' || e === 'EN MANTENIMIENTO') return;
    // En reemplazo con equipo seleccionado, filtrar por mismo tipo
    if (isReemplazo && reemTipoFiltro && (a.tipo||'').toUpperCase().trim() !== reemTipoFiltro) return;
    (a.series||[]).forEach(s => {
      const key = a.id + '||' + (s.serie||'').toUpperCase().trim();
      if (!seriesAsig.has(key)) {
        stock.push({ activoId: a.id, tipo: (a.tipo||'').toUpperCase().trim(), equipo: a.equipo||a.tipo||'', marca: a.marca, modelo: a.modelo, serie: s.serie||'', codInventario: s.codInventario||'', ubicacion: a.ubicacion||'', codigo: a.codigo||'', gama: a.gama||'' });
      }
    });
  });

  // Filter stock
  let filtered = stock;
  // Ingreso Nuevo: sección principal solo EP-ADMIN
  if (isIngresoNuevo) filtered = filtered.filter(r => _TIPOS_EP_ADMIN.includes(r.tipo));
  else if (!isReemplazo && _asigStockTipo !== 'Todos') filtered = filtered.filter(r => r.tipo === _asigStockTipo);
  // Filtro por almacén
  const almacenes = ['Todos', ...new Set(stock.map(r => r.ubicacion).filter(Boolean))];
  if (_asigStockAlmacen !== 'Todos') filtered = filtered.filter(r => r.ubicacion === _asigStockAlmacen);
  if (_asigStockSearch) {
    const s = _asigStockSearch.toLowerCase();
    filtered = filtered.filter(r => r.codigo.toLowerCase().includes(s) || r.modelo.toLowerCase().includes(s) || r.serie.toLowerCase().includes(s) || r.marca.toLowerCase().includes(s));
  }
  const tipos = isIngresoNuevo ? ['Todos', ..._TIPOS_EP_ADMIN.filter(t => stock.some(r => r.tipo === t))] : ['Todos', ...new Set(stock.map(r => r.tipo))];

  // Accesorios para Ingreso Nuevo
  let accFiltered = [];
  let accTipos = [];
  let accStockRowsHTML = '';
  let accPgInfo = '';
  let accTotalPages = 1;
  let accIsFirst = true;
  let accIsLast = true;
  if (isIngresoNuevo) {
    let accStock = stock.filter(r => !_TIPOS_EP_ADMIN.includes(r.tipo));
    if (_asigAccTipo !== 'Todos') accStock = accStock.filter(r => (r.equipo || r.tipo) === _asigAccTipo);
    if (_asigAccSearch) {
      const sa = _asigAccSearch.toLowerCase();
      accStock = accStock.filter(r => r.codigo.toLowerCase().includes(sa) || r.modelo.toLowerCase().includes(sa) || r.serie.toLowerCase().includes(sa) || r.marca.toLowerCase().includes(sa) || (r.equipo||'').toLowerCase().includes(sa));
    }
    accFiltered = accStock;
    accTipos = ['Todos', ...new Set(stock.filter(r => !_TIPOS_EP_ADMIN.includes(r.tipo)).map(r => r.equipo || r.tipo))];
    accTotalPages = Math.ceil(accFiltered.length / _ASIG_PAGE_SIZE) || 1;
    if (_asigAccPage >= accTotalPages) _asigAccPage = accTotalPages - 1;
    if (_asigAccPage < 0) _asigAccPage = 0;
    const accPgStart = _asigAccPage * _ASIG_PAGE_SIZE;
    const accPageItems = accFiltered.slice(accPgStart, accPgStart + _ASIG_PAGE_SIZE);
    const accSelSet = new Set(_asigSelectedAccesorios.map(x => x.activoId + '||' + x.serie));
    accStockRowsHTML = accPageItems.length === 0
      ? `<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;font-size:12px">No hay accesorios disponibles</td></tr>`
      : accPageItems.map((r, pi) => {
          const gi = accPgStart + pi;
          const isSel = accSelSet.has(r.activoId + '||' + r.serie);
          return `<tr style="border-bottom:1px solid #f1f5f9;background:${isSel ? '#fef3c7' : ''};cursor:pointer"
            onclick="_asigToggleAcc(${gi})" onmouseover="if(!this.style.background.includes('fef3c7'))this.style.background='#f8fafc'" onmouseout="if(!this.style.background.includes('fef3c7'))this.style.background=''">
            <td style="padding:6px;text-align:center"><input type="checkbox" ${isSel ? 'checked' : ''} onclick="event.stopPropagation();_asigToggleAcc(${gi})"></td>
            <td style="padding:6px 8px;font-family:monospace;font-size:11px;font-weight:700">${esc(r.codigo)}</td>
            <td style="padding:6px 8px;font-size:11px">${esc(r.equipo || r.tipo)}</td>
            <td style="padding:6px 8px">${esc(r.marca)} ${esc(r.modelo)}</td>
            <td style="padding:6px 8px;font-family:monospace;font-size:11px">${esc(r.serie || '—')}</td>
          </tr>`;
        }).join('');
    accPgInfo = accFiltered.length > 0 ? `${accPgStart + 1}-${Math.min(accPgStart + _ASIG_PAGE_SIZE, accFiltered.length)} de ${accFiltered.length}` : '0 resultados';
    accIsFirst = _asigAccPage === 0;
    accIsLast = _asigAccPage >= accTotalPages - 1;
    window._asigAccStockList = accFiltered;
  }

  // Check if stock is LAPTOP type (to show gama column)
  const _stockEsLaptop = filtered.length > 0 && filtered.every(r => r.tipo === 'LAPTOP');

  // Check which are already selected
  const selSet = new Set(_asigSelectedActivos.map(x => x.activoId + '||' + x.serie));

  // Pagination
  const totalPages = Math.ceil(filtered.length / _ASIG_PAGE_SIZE) || 1;
  if (_asigStockPage >= totalPages) _asigStockPage = totalPages - 1;
  if (_asigStockPage < 0) _asigStockPage = 0;
  const pgStart = _asigStockPage * _ASIG_PAGE_SIZE;
  const pageItems = filtered.slice(pgStart, pgStart + _ASIG_PAGE_SIZE);
  const pageAllSel = pageItems.length > 0 && pageItems.every(r => selSet.has(r.activoId + '||' + r.serie));

  // Build stock table rows
  const stockRowsHTML = pageItems.length === 0
    ? `<tr><td colspan="${_stockEsLaptop ? 8 : 7}" style="padding:20px;text-align:center;color:#94a3b8;font-size:12px">No hay equipos disponibles</td></tr>`
    : pageItems.map((r, pi) => {
        const gi = pgStart + pi;
        const isSel = selSet.has(r.activoId + '||' + r.serie);
        // En reemplazo o ingreso nuevo: radio (solo 1), normal: checkbox (múltiple)
        const inputType = (isReemplazo || isIngresoNuevo) ? 'radio' : 'checkbox';
        return `<tr style="border-bottom:1px solid #f1f5f9;background:${isSel ? '#eff6ff' : ''};cursor:pointer"
          onclick="_asigToggleStock(${gi})" onmouseover="if(!this.style.background.includes('eff6ff'))this.style.background='#f8fafc'" onmouseout="if(!this.style.background.includes('eff6ff'))this.style.background=''">
          <td style="padding:6px;text-align:center">
            <input type="${inputType}" name="reemNew" ${isSel ? 'checked' : ''} onclick="event.stopPropagation();_asigToggleStock(${gi})">
          </td>
          <td style="padding:6px 8px;font-family:monospace;font-size:11px;font-weight:700">${esc(r.codigo)}</td>
          <td style="padding:6px 8px;font-size:11px">${esc(r.equipo || r.tipo)}</td>
          <td style="padding:6px 8px">${esc(r.marca)} ${esc(r.modelo)}</td>
          <td style="padding:6px 8px;font-family:monospace;font-size:11px">${esc(r.serie || '—')}</td>
          ${_stockEsLaptop ? `<td style="padding:6px 8px;font-size:11px;color:#64748b">${esc(r.gama || '—')}</td>` : ''}
          <td style="padding:6px 8px;font-size:11px;color:#64748b">${esc(r.ubicacion)}</td>
        </tr>`;
      }).join('');

  // Pagination info
  const pgInfo = filtered.length > 0 ? `${pgStart + 1}-${Math.min(pgStart + _ASIG_PAGE_SIZE, filtered.length)} de ${filtered.length}` : '0 resultados';
  const btnStyle = (disabled) => `border:1px solid #e2e8f0;background:#fff;border-radius:6px;width:28px;height:28px;cursor:${disabled ? 'default' : 'pointer'};font-size:11px;color:${disabled ? '#cbd5e1' : '#334155'};display:flex;align-items:center;justify-content:center`;
  const isFirst = _asigStockPage === 0;
  const isLast = _asigStockPage >= totalPages - 1;

  // Reemplazo / Renovación summary
  let reemSummaryHTML = '';
  if (isReemplazo && _asigReemOld && _asigSelectedActivos.length > 0) {
    const oldAct = activos.find(x => x.id === _asigReemOld.activoId);
    const newItem = _asigSelectedActivos[0];
    const _sumLabel = isReposicionRobo ? 'Resumen de la reposición por robo' : isReposicionDano ? 'Resumen de la reposición por daño físico' : isRenovacion ? 'Resumen de la renovación' : 'Resumen del reemplazo';
    reemSummaryHTML = `
      <div style="margin-top:14px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px">
        <div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:8px">${_sumLabel}</div>
        <div style="display:flex;align-items:center;gap:10px;font-size:12px">
          <div style="flex:1;padding:8px;background:#fff;border-radius:6px;border:1px solid #fecaca">
            <div style="font-size:10px;color:#dc2626;font-weight:600;margin-bottom:2px">${isReposicionRobo ? 'EQUIPO ROBADO' : isReposicionDano ? 'EQUIPO DAÑADO' : 'RETIRAR'}</div>
            <strong>${oldAct ? esc(oldAct.codigo) : '—'}</strong> — ${oldAct ? esc(oldAct.marca) + ' ' + esc(oldAct.modelo) : ''}<br>
            <span style="font-size:11px;color:#64748b">Serie: ${esc(_asigReemOld.serieAsignada || '—')}</span>
          </div>
          <span style="font-size:18px;color:#10b981;font-weight:700">→</span>
          <div style="flex:1;padding:8px;background:#fff;border-radius:6px;border:1px solid #bbf7d0">
            <div style="font-size:10px;color:#16a34a;font-weight:600;margin-bottom:2px">${isReposicionDano ? 'REPOSICIÓN' : 'ENTREGAR'}</div>
            <strong>${esc(newItem.codigo)}</strong> — ${esc(newItem.marca)} ${esc(newItem.modelo)}<br>
            <span style="font-size:11px;color:#64748b">Serie: ${esc(newItem.serie || '—')}</span>
          </div>
        </div>
      </div>`;
  }

  const _asigBodyHTML = `
    <div style="display:flex;flex-direction:column;gap:0">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;margin-bottom:16px;border-bottom:2px solid #dbeafe">
        <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,${isReposicionRobo ? '#7c3aed,#4c1d95' : isReposicionDano ? '#dc2626,#991b1b' : isReemplazo ? '#ea580c,#dc2626' : isPrestamo ? '#d97706,#b45309' : isIngresoNuevo ? '#059669,#047857' : '#3b82f6,#2563eb'});display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;box-shadow:0 4px 12px ${isReposicionRobo ? 'rgba(124,58,237,.25)' : isReposicionDano ? 'rgba(220,38,38,.25)' : isReemplazo ? 'rgba(234,88,12,.25)' : isPrestamo ? 'rgba(217,119,6,.25)' : isIngresoNuevo ? 'rgba(5,150,105,.25)' : 'rgba(37,99,235,.25)'}">${isReposicionRobo ? '🚨' : isReposicionDano ? '🛠️' : isReemplazo ? '🔄' : isPrestamo ? '⏱️' : isIngresoNuevo ? '🆕' : '📋'}</div>
        <div>
          <h2 style="margin:0;font-size:17px;font-weight:800;color:#0f172a">${isReposicionRobo ? 'Reposición por Robo' : isReposicionDano ? 'Reposición por Daño Físico' : isReemplazo ? (isRenovacion ? 'Renovación de Equipo' : 'Reemplazo de Equipo') : isPrestamo ? 'Préstamo de Equipo' : isIngresoNuevo ? 'Ingreso Nuevo — Asignación Inicial' : 'Asignación de Activo'}</h2>
          <div style="font-size:11px;color:#64748b;margin-top:1px">${isReposicionRobo ? 'Reponer equipo robado y registrar el caso para control y trazabilidad' : isReposicionDano ? 'Reponer equipo dañado físicamente a un colaborador' : isReemplazo ? (isRenovacion ? 'Renovar equipo asignado a un colaborador' : 'Reemplazar equipo asignado a un colaborador') : isPrestamo ? 'Préstamo temporal de equipo a un colaborador' : isIngresoNuevo ? 'Asignar kit inicial a un colaborador nuevo sin equipo' : 'Asignar equipos del inventario a un colaborador'}</div>
        </div>
      </div>

      <!-- Row 1: Ticket info -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div>
          <label style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Información del Ticket</label>
          <div style="display:flex;align-items:center;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;height:38px">
            <span style="padding:0 10px;font-size:11px;font-weight:600;color:#64748b;background:#f8fafc;height:100%;display:flex;align-items:center;border-right:1px solid #e2e8f0;white-space:nowrap">Fecha</span>
            <input type="date" class="form-control" id="fAsigFecha" value="${_asigFecha || today()}" style="border:none;border-radius:0;height:100%;font-size:12px;flex:1">
            <span onclick="document.getElementById('fAsigFecha').showPicker()" style="padding:0 10px;cursor:pointer;font-size:14px;color:#3b82f6;background:#f8fafc;height:100%;display:flex;align-items:center;border-left:1px solid #e2e8f0">📅</span>
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Ingresar Ticket <span class="required">*</span></label>
          <div style="display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;height:38px">
            <span style="padding:0 10px;font-size:14px;color:#64748b;background:#f8fafc;height:100%;display:flex;align-items:center;border-right:1px solid #e2e8f0">🔍</span>
            <input class="form-control" id="fAsigTicket" placeholder="REQ000000" value="${esc(_asigTicket)}" style="border:none;border-radius:0;height:100%;font-size:12px;flex:1">
          </div>
        </div>
      </div>

      <!-- Row 2: Motivo + Observaciones -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div>
          <label style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Motivo <span class="required">*</span></label>
          ${isReposicionDano || isReposicionRobo ? `
            <div style="height:38px;font-size:12px;font-weight:700;color:${isReposicionRobo ? '#4c1d95' : '#991b1b'};background:${isReposicionRobo ? '#f5f3ff' : '#fef2f2'};border:1px solid ${isReposicionRobo ? '#c4b5fd' : '#fecaca'};border-radius:8px;display:flex;align-items:center;padding:0 12px;gap:6px">
              <span style="font-size:14px">${isReposicionRobo ? '🚨' : '🛠️'}</span> ${isReposicionRobo ? 'REPOSICIÓN ROBO' : 'REPOSICIÓN DAÑO FÍSICO'}
            </div>
            <input type="hidden" id="fAsigMotivo" value="${isReposicionRobo ? 'REPOSICIÓN ROBO' : 'REPOSICIÓN DAÑO FÍSICO'}">
          ` : `
          <select class="form-control" id="fAsigMotivo" onchange="_onMotivoAsigChange()" style="height:38px;font-size:12px">
            <option value="">Seleccionar...</option>
            ${motivosAsig.map(m => `<option value="${esc(m)}" ${motVal.toUpperCase() === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
          `}
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Observaciones</label>
          <input class="form-control" id="fAsigObs" placeholder="Ingrese observaciones aquí..." value="${esc(_asigObs)}" style="height:38px;font-size:12px">
        </div>
      </div>

      <!-- Row 3: Colaborador -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <span style="font-size:14px">📇</span>
            <span style="font-size:12px;font-weight:700;color:#334155">Colaborador</span>
          </div>
          <div style="position:relative">
            <div style="display:flex;align-items:center;border:1px solid ${isIngresoNuevo ? '#fbbf24' : '#e2e8f0'};border-radius:8px;overflow:hidden;height:36px${isIngresoNuevo ? ';background:#fffbeb' : ''}">
              <span style="padding:0 8px;font-size:13px;color:#94a3b8">🔍</span>
              <input class="form-control" id="fAsigUserSearch" placeholder="${isIngresoNuevo ? 'Buscar colaborador sin equipo...' : 'Buscar por nombre, DNI o correo...'}"
                oninput="_buscarColabAsig(this.value)" autocomplete="off" value="${c ? esc(c.nombre) : ''}"
                style="border:none;border-radius:0;height:100%;font-size:12px;flex:1;${isIngresoNuevo ? 'background:transparent' : ''}">
              <span onclick="_toggleColabDropdown()" style="padding:0 10px;cursor:pointer;font-size:12px;color:#64748b;height:100%;display:flex;align-items:center;border-left:1px solid #e2e8f0;background:#f8fafc;user-select:none" title="Ver lista de colaboradores">▼</span>
            </div>
            <div id="asigUserResults" style="position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;max-height:220px;overflow-y:auto;z-index:10;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.1)"></div>
          </div>
        </div>
        <div id="asigUserConfirm" style="border:1px solid ${c ? '#bbf7d0' : '#e2e8f0'};border-radius:10px;padding:12px;background:${c ? '#f0fdf4' : '#fafafa'}">
          ${c ? `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
              <span style="width:18px;height:18px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff">✓</span>
              <span style="font-size:11px;font-weight:600;color:#334155">Usuario seleccionado:</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">${esc((c.nombre||'').split(' ').map(p=>p[0]).slice(0,2).join(''))}</div>
              <div>
                <div style="font-size:13px;font-weight:700;color:#0f172a">${esc(c.nombre)}</div>
                <div style="font-size:11px;color:#64748b">${esc(c.area||'')} - ${esc(c.ubicacion||'')} &nbsp;|&nbsp; ${esc(c.cargo||'')}</div>
              </div>
            </div>
          ` : `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px">Seleccione un colaborador...</div>
          `}
        </div>
      </div>
      ${isIngresoNuevo ? `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:8px 12px;font-size:11px;color:#065f46;margin-bottom:16px;display:flex;align-items:center;gap:8px">
        <span style="font-size:14px">ℹ️</span>
        <span>Solo se muestran colaboradores activos <strong>sin equipo principal asignado</strong> (laptop/desktop). Los nuevos colaboradores deben registrarse primero en el <strong>Padrón de Colaboradores</strong>.</span>
      </div>` : ''}

      <!-- Row 3b: Fecha fin de préstamo (solo para PRÉSTAMO) -->
      ${isPrestamo ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div>
          <label style="font-size:11px;font-weight:700;color:#b45309;margin-bottom:6px;display:block">⏱️ Fecha fin de préstamo <span class="required">*</span></label>
          <div style="display:flex;align-items:center;gap:0;border:1px solid #fbbf24;border-radius:8px;overflow:hidden;height:38px;background:#fffbeb">
            <input type="date" class="form-control" id="fAsigFechaPrestamo" value="${_asigFechaPrestamo || ''}" min="${today()}" style="border:none;border-radius:0;height:100%;font-size:12px;flex:1;background:transparent">
            <span onclick="document.getElementById('fAsigFechaPrestamo').showPicker()" style="padding:0 10px;cursor:pointer;font-size:14px;color:#d97706;background:#fef3c7;height:100%;display:flex;align-items:center;border-left:1px solid #fbbf24">📅</span>
          </div>
        </div>
        <div style="display:flex;align-items:end">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:11px;color:#92400e;width:100%">
            El equipo deberá ser devuelto en la fecha indicada. El préstamo quedará registrado como temporal.
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Row 4: Reemplazo - Equipos asignados al usuario -->
      ${isReemplazo && motVal ? `
      <div style="display:${c ? '' : 'none'}">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
          <span style="font-size:14px">📦</span>
          <label style="font-size:13px;font-weight:700;color:#334155">Activos asignados al usuario</label>
          <span style="font-size:11px;color:#94a3b8;margin-left:auto">${isReposicionRobo ? 'Seleccione el equipo robado' : isReposicionDano ? 'Seleccione el equipo dañado a retirar' : 'Seleccione el equipo a reemplazar'}</span>
        </div>
        ${!c ? '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;background:#f8fafc;border-radius:8px">Primero seleccione un colaborador</div>' : reemAsigHTML && reemAsigHTML.startsWith('<tr') ? `
        <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:16px">
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <thead><tr style="background:#fefce8">
              <th style="padding:8px 6px;width:36px;text-align:center;border-bottom:1px solid #e2e8f0"></th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Código</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Equipo</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Marca / Modelo</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Serie</th>
              ${_reemHasLaptop ? '<th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Gama</th>' : ''}
            </tr></thead>
            <tbody>${reemAsigHTML}</tbody>
          </table>
        </div>` : `<div style="margin-bottom:16px">${reemAsigHTML}</div>`}
      </div>` : ''}

      <!-- Row 5: Stock table (inline) with pagination -->
      <div id="asigActivoSection" style="display:${isReemplazo ? (_asigReemOld ? '' : 'none') : (motVal ? '' : 'none')}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:14px">${isReemplazo ? '🔄' : isIngresoNuevo ? '💻' : '💻'}</span>
            <label style="font-size:13px;font-weight:700;color:#334155">${isReposicionRobo ? `Equipo de reposición (Stock ${reemTipoFiltro || ''})` : isReposicionDano ? `Equipo de reposición (Stock ${reemTipoFiltro || ''})` : isReemplazo ? `Equipo nuevo (Stock ${reemTipoFiltro || ''})` : isIngresoNuevo ? 'Equipo Principal (EP-ADMIN)' : 'Activo a asignar (Inventario disponible)'} ${_asigSelectedActivos.length > 0 ? `<span style="font-size:11px;font-weight:500;color:#2563eb;margin-left:6px">${_asigSelectedActivos.length} seleccionado(s)</span>` : ''}</label>
          </div>
          <span style="font-size:11px;color:#94a3b8">${filtered.length} equipo(s)</span>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:10px">
          <div style="display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;flex:1;height:36px">
            <span style="padding:0 8px;font-size:13px;color:#94a3b8">🔍</span>
            <input type="text" id="asigStockSearch" placeholder="Buscar por código, modelo o serie..." value="${esc(_asigStockSearch)}"
              oninput="_asigStockSearch=this.value;_asigStockPage=0;_renderAsignacionModal()" style="border:none;flex:1;height:100%;font-size:12px;outline:none;background:transparent">
          </div>
          ${(!isReemplazo && !isIngresoNuevo) ? `
          <select id="asigStockTipoFilter" onchange="_asigStockTipo=this.value;_asigStockPage=0;_renderAsignacionModal()" style="border:1px solid #e2e8f0;border-radius:8px;padding:0 10px;font-size:11px;color:#334155;height:36px;min-width:130px;cursor:pointer">
            ${tipos.map(t => `<option value="${esc(t)}" ${_asigStockTipo===t?'selected':''}>${esc(t)}${t!=='Todos'?' ('+filtered.filter(r=>r.tipo===t).length+')':' ('+stock.length+')'}</option>`).join('')}
          </select>` : isIngresoNuevo ? `<span style="font-size:11px;color:#64748b;padding:0 10px;display:flex;align-items:center;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;height:36px">LAPTOP / DESKTOP</span>` : ''}
          <select onchange="_asigStockAlmacen=this.value;_asigStockPage=0;_renderAsignacionModal()" style="border:1px solid #e2e8f0;border-radius:8px;padding:0 10px;font-size:11px;color:#334155;height:36px;min-width:140px;cursor:pointer">
            ${almacenes.map(a => `<option value="${esc(a)}" ${_asigStockAlmacen===a?'selected':''}>${a === 'Todos' ? 'Todos los almacenes' : esc(a)}</option>`).join('')}
          </select>
        </div>

        <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <thead><tr style="background:#f8fafc">
              <th style="padding:8px 6px;width:36px;text-align:center;border-bottom:1px solid #e2e8f0">
                ${(!isReemplazo && !isIngresoNuevo) ? `<input type="checkbox" onchange="_asigTogglePageAll(this.checked)" ${pageAllSel ? 'checked' : ''}>` : ''}
              </th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Código</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Equipo</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Marca / Modelo</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Serie</th>
              ${_stockEsLaptop ? '<th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Gama</th>' : ''}
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Ubicación</th>
            </tr></thead>
            <tbody>${stockRowsHTML}</tbody>
          </table>
        </div>

        <!-- Pagination bar -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:0 4px">
          <span style="font-size:11px;color:#64748b">${pgInfo}</span>
          <div style="display:flex;align-items:center;gap:4px">
            <button onclick="_asigStockPage=0;_renderAsignacionModal()" ${isFirst ? 'disabled' : ''} style="${btnStyle(isFirst)}">«</button>
            <button onclick="_asigStockPage--;_renderAsignacionModal()" ${isFirst ? 'disabled' : ''} style="${btnStyle(isFirst)}">‹</button>
            <span style="font-size:11px;font-weight:600;color:#334155;padding:0 8px">Pág ${_asigStockPage + 1} / ${totalPages}</span>
            <button onclick="_asigStockPage++;_renderAsignacionModal()" ${isLast ? 'disabled' : ''} style="${btnStyle(isLast)}">›</button>
            <button onclick="_asigStockPage=${totalPages - 1};_renderAsignacionModal()" ${isLast ? 'disabled' : ''} style="${btnStyle(isLast)}">»</button>
          </div>
        </div>
      </div>

      ${reemSummaryHTML}

      <!-- Sección Accesorios Ergonómicos (solo Ingreso Nuevo) -->
      ${isIngresoNuevo ? `
      <div style="margin-top:20px;display:${motVal ? '' : 'none'}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:14px">🖥️</span>
            <label style="font-size:13px;font-weight:700;color:#334155">Accesorios Ergonómicos (ADIC-ERG) ${_asigSelectedAccesorios.length > 0 ? `<span style="font-size:11px;font-weight:500;color:#d97706;margin-left:6px">${_asigSelectedAccesorios.length} seleccionado(s)</span>` : ''}</label>
          </div>
          <span style="font-size:11px;color:#94a3b8">${accFiltered.length} accesorio(s)</span>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:10px">
          <div style="display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;flex:1;height:36px">
            <span style="padding:0 8px;font-size:13px;color:#94a3b8">🔍</span>
            <input type="text" id="asigAccSearch" placeholder="Buscar accesorio..." value="${esc(_asigAccSearch)}"
              oninput="_asigAccSearch=this.value;_asigAccPage=0;_renderAsignacionModal()" style="border:none;flex:1;height:100%;font-size:12px;outline:none;background:transparent">
          </div>
          <select onchange="_asigAccTipo=this.value;_asigAccPage=0;_renderAsignacionModal()" style="border:1px solid #e2e8f0;border-radius:8px;padding:0 10px;font-size:11px;color:#334155;height:36px;min-width:130px;cursor:pointer">
            ${accTipos.map(t => `<option value="${esc(t)}" ${_asigAccTipo===t?'selected':''}>${esc(t)}${t!=='Todos'?' ('+accFiltered.filter(r=>(r.equipo||r.tipo)===t).length+')':''}</option>`).join('')}
          </select>
        </div>

        <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <thead><tr style="background:#fffbeb">
              <th style="padding:8px 6px;width:36px;text-align:center;border-bottom:1px solid #e2e8f0">
                <input type="checkbox" onchange="_asigToggleAccPageAll(this.checked)" ${(() => { const accSelSet2 = new Set(_asigSelectedAccesorios.map(x => x.activoId + '||' + x.serie)); const accPgStart2 = _asigAccPage * _ASIG_PAGE_SIZE; const accPgItems2 = accFiltered.slice(accPgStart2, accPgStart2 + _ASIG_PAGE_SIZE); return accPgItems2.length > 0 && accPgItems2.every(r => accSelSet2.has(r.activoId + '||' + r.serie)) ? 'checked' : ''; })()}>
              </th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Código</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Equipo</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Modelo</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px;border-bottom:1px solid #e2e8f0">Serie</th>
            </tr></thead>
            <tbody>${accStockRowsHTML}</tbody>
          </table>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:0 4px">
          <span style="font-size:11px;color:#64748b">${accPgInfo}</span>
          <div style="display:flex;align-items:center;gap:4px">
            <button onclick="_asigAccPage=0;_renderAsignacionModal()" ${accIsFirst ? 'disabled' : ''} style="${btnStyle(accIsFirst)}">«</button>
            <button onclick="_asigAccPage--;_renderAsignacionModal()" ${accIsFirst ? 'disabled' : ''} style="${btnStyle(accIsFirst)}">‹</button>
            <span style="font-size:11px;font-weight:600;color:#334155;padding:0 8px">Pág ${_asigAccPage + 1} / ${accTotalPages}</span>
            <button onclick="_asigAccPage++;_renderAsignacionModal()" ${accIsLast ? 'disabled' : ''} style="${btnStyle(accIsLast)}">›</button>
            <button onclick="_asigAccPage=${accTotalPages - 1};_renderAsignacionModal()" ${accIsLast ? 'disabled' : ''} style="${btnStyle(accIsLast)}">»</button>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
  `;
  const _asigFooterHTML = `
    <button class="btn btn-secondary" onclick="_asigCancelar()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveAsignacion()" ${isReposicionRobo ? 'style="background:#7c3aed;border-color:#7c3aed"' : isReposicionDano ? 'style="background:#dc2626;border-color:#dc2626"' : ''}>${isReposicionRobo ? 'Confirmar Reposición por Robo' : isReposicionDano ? 'Confirmar Reposición' : isReemplazo ? (isRenovacion ? 'Confirmar Renovación' : 'Confirmar Reemplazo') : isPrestamo ? 'Confirmar Préstamo' : isIngresoNuevo ? 'Confirmar Ingreso Nuevo' : 'Confirmar Asignación'}</button>
  `;
  // Si el modal ya está abierto, solo actualizar contenido sin re-abrir (evita flash)
  if (document.getElementById('modalOverlay').classList.contains('show')) {
    document.getElementById('modalBody').innerHTML = _asigBodyHTML;
    document.getElementById('modalFooter').innerHTML = _asigFooterHTML;
    document.getElementById('modal').className = 'modal modal-lg';
  } else {
    openModal('', _asigBodyHTML, _asigFooterHTML, 'modal-lg');
  }

  // Save full filtered stock reference for toggling
  window._asigStockList = filtered;

  // Focus search if needed
  const searchEl = document.getElementById('asigStockSearch');
  if (searchEl && _asigStockSearch) { searchEl.focus(); searchEl.setSelectionRange(searchEl.value.length, searchEl.value.length); }
  const accSearchEl = document.getElementById('asigAccSearch');
  if (accSearchEl && _asigAccSearch) { accSearchEl.focus(); accSearchEl.setSelectionRange(accSearchEl.value.length, accSearchEl.value.length); }
}

function _asigCancelar() {
  closeModal();
  renderAsignacion(document.getElementById('contentArea'));
}

function _asigToggleStock(idx) {
  const stock = window._asigStockList || [];
  const item = stock[idx];
  if (!item) return;
  const _toggleUp = (_asigMotivo || '').toUpperCase();
  const isReem = _toggleUp.includes('REEMPLAZO') || _toggleUp.includes('RENOVACIÓN') || _toggleUp.includes('RENOVACION');
  const _isIN = _toggleUp.includes('INGRESO NUEVO');
  if (isReem || _isIN) {
    // Radio: solo 1 seleccionado
    const already = _asigSelectedActivos.length === 1 && _asigSelectedActivos[0].activoId === item.activoId && _asigSelectedActivos[0].serie === item.serie;
    _asigSelectedActivos = already ? [] : [item];
  } else {
    const existIdx = _asigSelectedActivos.findIndex(x => x.activoId === item.activoId && x.serie === item.serie);
    if (existIdx >= 0) {
      _asigSelectedActivos.splice(existIdx, 1);
    } else {
      _asigSelectedActivos.push(item);
    }
  }
  _renderAsignacionModal();
}

function _asigToggleAcc(idx) {
  const stock = window._asigAccStockList || [];
  const item = stock[idx];
  if (!item) return;
  const existIdx = _asigSelectedAccesorios.findIndex(x => x.activoId === item.activoId && x.serie === item.serie);
  if (existIdx >= 0) {
    _asigSelectedAccesorios.splice(existIdx, 1);
  } else {
    const itemTipo = (item.equipo || item.tipo || '').toUpperCase();
    const yaExiste = _asigSelectedAccesorios.find(x => (x.equipo || x.tipo || '').toUpperCase() === itemTipo);
    if (yaExiste) {
      showToast('Ya tienes un ' + itemTipo + ' seleccionado. Solo se permite 1 por tipo de accesorio.', 'error');
      return;
    }
    _asigSelectedAccesorios.push(item);
  }
  _renderAsignacionModal();
}

function _asigToggleAccPageAll(checked) {
  const stock = window._asigAccStockList || [];
  const pgStart = _asigAccPage * _ASIG_PAGE_SIZE;
  const pageItems = stock.slice(pgStart, pgStart + _ASIG_PAGE_SIZE);
  pageItems.forEach(item => {
    const idx = _asigSelectedAccesorios.findIndex(x => x.activoId === item.activoId && x.serie === item.serie);
    if (checked && idx < 0) {
      const itemTipo = (item.equipo || item.tipo || '').toUpperCase();
      const yaExiste = _asigSelectedAccesorios.find(x => (x.equipo || x.tipo || '').toUpperCase() === itemTipo);
      if (!yaExiste) _asigSelectedAccesorios.push(item);
    }
    if (!checked && idx >= 0) _asigSelectedAccesorios.splice(idx, 1);
  });
  _renderAsignacionModal();
}

function _asigSelectReemOld(asigId) {
  const asignaciones = DB.get('asignaciones');
  const a = asignaciones.find(x => x.id === asigId);
  if (!a) return;
  // Toggle: si ya está seleccionado, deseleccionar
  if (_asigReemOld && _asigReemOld.id === asigId) {
    _asigReemOld = null;
  } else {
    _asigReemOld = a;
  }
  _asigSelectedActivos = [];
  _asigStockSearch = '';
  _asigStockPage = 0;
  _renderAsignacionModal();
}

function _asigTogglePageAll(checked) {
  const stock = window._asigStockList || [];
  const start = _asigStockPage * _ASIG_PAGE_SIZE;
  const pageItems = stock.slice(start, start + _ASIG_PAGE_SIZE);
  if (checked) {
    pageItems.forEach(item => {
      if (!_asigSelectedActivos.some(x => x.activoId === item.activoId && x.serie === item.serie)) {
        _asigSelectedActivos.push(item);
      }
    });
  } else {
    pageItems.forEach(item => {
      const idx = _asigSelectedActivos.findIndex(x => x.activoId === item.activoId && x.serie === item.serie);
      if (idx >= 0) _asigSelectedActivos.splice(idx, 1);
    });
  }
  _renderAsignacionModal();
}

let _buscarColabTimer = null;
function _buscarColabAsig(val) {
  clearTimeout(_buscarColabTimer);
  _buscarColabTimer = setTimeout(() => {
    const box = document.getElementById('asigUserResults');
    if (!box) return;
    if (!val || val.length < 2) { box.style.display = 'none'; return; }

    let colabs = DB.get('colaboradores').filter(c => c.estado === 'Activo');
    // Ingreso Nuevo: solo colaboradores sin equipo principal
    if (window._asigIsIngresoNuevo && window._asigColabsConEquipo) {
      colabs = colabs.filter(c => !window._asigColabsConEquipo.has(c.id));
    }
    const s = val.toLowerCase();
    const found = colabs.filter(c =>
      (c.nombre || '').toLowerCase().includes(s) ||
      (c.dni || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s)
    ).slice(0, 8);

    _renderColabResults(box, found);
  }, 150);
}

function _renderColabResults(box, found) {
  const isIN = window._asigIsIngresoNuevo;
  if (found.length === 0) {
    box.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--text-muted)">' + (isIN ? 'No hay colaboradores sin equipo principal' : 'Sin coincidencias') + '</div>';
  } else {
    box.innerHTML = found.map(c => `
      <div style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
           onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background=''"
           onclick="_selectColabAsig(${c.id})">
        <div>
          <strong>${esc(c.nombre)}</strong>
          <span style="color:var(--text-muted);margin-left:6px">DNI: ${esc(c.dni || '')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${isIN ? '<span style="font-size:9px;padding:2px 6px;background:#fef3c7;color:#92400e;border-radius:4px;font-weight:600">Sin equipo</span>' : ''}
          <span style="color:var(--text-light);font-size:11px">${esc(c.email || '')}</span>
        </div>
      </div>
    `).join('');
  }
  box.style.display = 'block';
}

function _toggleColabDropdown() {
  const box = document.getElementById('asigUserResults');
  if (!box) return;
  if (box.style.display === 'block') { box.style.display = 'none'; return; }
  let colabs = DB.get('colaboradores').filter(c => c.estado === 'Activo');
  if (window._asigIsIngresoNuevo && window._asigColabsConEquipo) {
    colabs = colabs.filter(c => !window._asigColabsConEquipo.has(c.id));
  }
  _renderColabResults(box, colabs.slice(0, 15));
}

function _selectColabAsig(id) {
  const c = DB.get('colaboradores').find(x => x.id === id);
  if (!c) return;
  _asigSelectedColab = c;
  _asigReemOld = null;
  _asigSelectedActivos = [];
  _asigStockPage = 0;
  _renderAsignacionModal();
}

function _onMotivoAsigChange(preserveState) {
  const motivo = document.getElementById('fAsigMotivo').value;
  _asigMotivo = motivo;

  if (!preserveState) {
    _asigSelectedActivos = [];
    _asigSelectedAccesorios = [];
    _asigReemOld = null;
    _asigStockPage = 0;
    _asigAccPage = 0;
    _asigAccSearch = '';
    _asigAccTipo = 'Todos';
  }
  // Si cambia a Ingreso Nuevo y el colab ya tiene equipo principal, limpiar selección
  const _motChgUp = (motivo || '').toUpperCase();
  if (_motChgUp.includes('INGRESO NUEVO') && _asigSelectedColab) {
    const _chkAsig = DB.get('asignaciones');
    const _tieneEquipo = _chkAsig.some(a => a.estado === 'Vigente' && a.colaboradorId === _asigSelectedColab.id && ['LAPTOP','DESKTOP'].includes((a.activoTipo || '').toUpperCase()));
    if (_tieneEquipo) _asigSelectedColab = null;
  }
  _renderAsignacionModal();
}

/* ═══════════════════════════════════════════════════════
   REEMPLAZO DE EQUIPO — Modal dedicado
   ═══════════════════════════════════════════════════════ */
let _reemColab = null;
let _reemOldAsig = null;   // asignación del equipo a reemplazar
let _reemNewItem = null;   // equipo nuevo seleccionado del stock

const _REEM_MOTIVOS = ['FALLA TÉCNICA', 'RENOVACIÓN TECNOLÓGICA', 'CAMBIO DE PERFIL', 'PÉRDIDA / ROBO', 'OTRO'];

function openReemplazoModal() {
  _reemColab = null;
  _reemOldAsig = null;
  _reemNewItem = null;
  _renderReemplazoModal();
}

function _renderReemplazoModal() {
  const c = _reemColab;
  const oldA = _reemOldAsig;
  const newI = _reemNewItem;
  const activos = DB.get('activos');

  // Step indicators
  const step = (num, label, active, done) => `
    <div style="display:flex;align-items:center;gap:6px">
      <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;${done ? 'background:#10b981;color:#fff' : active ? 'background:#ea580c;color:#fff' : 'background:#e2e8f0;color:#94a3b8'}">${done ? '✓' : num}</div>
      <span style="font-size:11px;font-weight:${active || done ? '700' : '500'};color:${active ? '#ea580c' : done ? '#10b981' : '#94a3b8'}">${label}</span>
    </div>`;

  const currentStep = !c ? 1 : !oldA ? 2 : !newI ? 3 : 4;

  // ── Equipos asignados al colaborador ──
  let equiposHTML = '';
  if (c) {
    const asigs = DB.get('asignaciones').filter(a => a.colaboradorId === c.id && a.estado === 'Vigente');
    if (asigs.length === 0) {
      equiposHTML = '<div style="padding:20px;text-align:center;color:#9a3412;font-size:12px">Este colaborador no tiene activos asignados.</div>';
    } else {
      const _wizHasLaptop = asigs.some(a => { const ax = activos.find(x => x.id === a.activoId); return ax && (ax.tipo||'').toUpperCase() === 'LAPTOP'; });
      equiposHTML = `
        <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <thead><tr style="background:#f8fafc">
              <th style="padding:8px 10px;width:40px"></th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Código</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Equipo</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Marca / Modelo</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Serie</th>
              ${_wizHasLaptop ? '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Gama</th>' : ''}
            </tr></thead>
            <tbody>
              ${asigs.map(a => {
                const act = activos.find(x => x.id === a.activoId);
                const sel = oldA && oldA.id === a.id;
                const esLaptop = act && (act.tipo||'').toUpperCase() === 'LAPTOP';
                return `<tr onclick="_reemSelectOld(${a.id})" style="cursor:pointer;background:${sel ? '#fff7ed' : ''};border-bottom:1px solid #f1f5f9"
                  onmouseover="if(!${sel})this.style.background='#f8fafc'" onmouseout="if(!${sel})this.style.background=''">
                  <td style="padding:8px 10px;text-align:center">
                    <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${sel ? '#ea580c' : '#cbd5e1'};display:flex;align-items:center;justify-content:center;margin:0 auto">
                      ${sel ? '<div style="width:10px;height:10px;border-radius:50%;background:#ea580c"></div>' : ''}
                    </div>
                  </td>
                  <td style="padding:8px 10px;font-family:monospace;font-size:11px">${act ? esc(act.codigo) : '—'}</td>
                  <td style="padding:8px 10px">${act ? esc(act.equipo || act.tipo) : '—'}</td>
                  <td style="padding:8px 10px;font-weight:600">${act ? esc(act.marca) + ' ' + esc(act.modelo) : '—'}</td>
                  <td style="padding:8px 10px;font-family:monospace;font-size:11px">${esc(a.serieAsignada || '—')}</td>
                  ${_wizHasLaptop ? `<td style="padding:8px 10px;font-size:11px;color:#64748b">${esLaptop ? esc(act.gama || '—') : '—'}</td>` : ''}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    }
  }

  // ── Stock disponible (filtrado por tipo del equipo a reemplazar) ──
  let stockHTML = '';
  if (oldA) {
    const act = activos.find(x => x.id === oldA.activoId);
    const tipoFiltro = act ? (act.tipo || '').toUpperCase().trim() : '';
    const asignaciones = DB.get('asignaciones');
    const seriesAsignadas = new Set(
      asignaciones.filter(a => a.estado === 'Vigente').map(a => a.activoId + '||' + (a.serieAsignada || '').toUpperCase().trim())
    );
    const stock = [];
    activos.forEach(a => {
      const estadoUp = (a.estado || '').toUpperCase();
      if (estadoUp === 'BAJA' || estadoUp === 'NO RECUPERABLE' || estadoUp === 'DADO DE BAJA' || estadoUp === 'EN MANTENIMIENTO') return;
      if (tipoFiltro && (a.tipo || '').toUpperCase().trim() !== tipoFiltro) return;
      (a.series || []).forEach(s => {
        const key = a.id + '||' + (s.serie || '').toUpperCase().trim();
        if (!seriesAsignadas.has(key)) {
          stock.push({ activoId: a.id, tipo: a.tipo, equipo: a.equipo||a.tipo||'', marca: a.marca, modelo: a.modelo, serie: s.serie || '', codInventario: s.codInventario || '', ubicacion: a.ubicacion || '', codigo: a.codigo || '', gama: a.gama || '' });
        }
      });
    });

    // Búsqueda y filtro almacén
    const searchVal = (document.getElementById('reemStockSearch') || {}).value || '';
    const _reemAlmacenVal = (document.getElementById('reemStockAlmacen') || {}).value || 'Todos';
    const _reemAlmacenes = ['Todos', ...new Set(stock.map(r => r.ubicacion).filter(Boolean))];
    const _reemEsLaptop = tipoFiltro === 'LAPTOP';
    let filtered = stock;
    if (_reemAlmacenVal !== 'Todos') filtered = filtered.filter(r => r.ubicacion === _reemAlmacenVal);
    if (searchVal) {
      const s = searchVal.toLowerCase();
      filtered = filtered.filter(r => r.codigo.toLowerCase().includes(s) || r.modelo.toLowerCase().includes(s) || r.serie.toLowerCase().includes(s) || r.marca.toLowerCase().includes(s));
    }

    stockHTML = `
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <div class="search-box" style="margin:0;flex:1">
          <span class="search-icon">🔍</span>
          <input type="text" id="reemStockSearch" placeholder="Buscar por código, modelo o serie..." value="${esc(searchVal)}" oninput="_reemRefreshStock()">
        </div>
        <select id="reemStockAlmacen" onchange="_reemRefreshStock()" style="border:1px solid #e2e8f0;border-radius:8px;padding:0 10px;font-size:11px;color:#334155;height:36px;min-width:140px;cursor:pointer">
          ${_reemAlmacenes.map(a => `<option value="${esc(a)}" ${_reemAlmacenVal===a?'selected':''}>${a === 'Todos' ? 'Todos los almacenes' : esc(a)}</option>`).join('')}
        </select>
      </div>
      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px;max-height:200px;overflow-y:auto">
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead style="position:sticky;top:0"><tr style="background:#f8fafc">
            <th style="padding:8px 10px;width:40px"></th>
            <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Código</th>
            <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Equipo</th>
            <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Marca / Modelo</th>
            <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Serie</th>
            ${_reemEsLaptop ? '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Gama</th>' : ''}
            <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Ubicación</th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0
              ? `<tr><td colspan="${_reemEsLaptop ? 8 : 7}" style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">No hay equipos disponibles de este tipo</td></tr>`
              : filtered.slice(0, 50).map((r, i) => {
                const sel = newI && newI.activoId === r.activoId && newI.serie === r.serie;
                return `<tr onclick="_reemSelectNew(${i})" style="cursor:pointer;background:${sel ? '#eff6ff' : ''};border-bottom:1px solid #f1f5f9"
                  onmouseover="if(!${sel})this.style.background='#f8fafc'" onmouseout="if(!${sel})this.style.background=''">
                  <td style="padding:8px 10px;text-align:center">
                    <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${sel ? '#2563eb' : '#cbd5e1'};display:flex;align-items:center;justify-content:center;margin:0 auto">
                      ${sel ? '<div style="width:10px;height:10px;border-radius:50%;background:#2563eb"></div>' : ''}
                    </div>
                  </td>
                  <td style="padding:8px 10px;font-family:monospace;font-size:11px">${esc(r.codigo)}</td>
                  <td style="padding:8px 10px">${esc(r.equipo || r.tipo)}</td>
                  <td style="padding:8px 10px;font-weight:600">${esc(r.marca)} ${esc(r.modelo)}</td>
                  <td style="padding:8px 10px;font-family:monospace;font-size:11px">${esc(r.serie || '—')}</td>
                  ${_reemEsLaptop ? `<td style="padding:8px 10px;font-size:11px;color:#64748b">${esc(r.gama || '—')}</td>` : ''}
                  <td style="padding:8px 10px;font-size:11px">${esc(r.ubicacion)}</td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>`;
    window._reemStockFiltered = filtered;
  }

  // ── Resumen final ──
  let resumenHTML = '';
  if (oldA && newI) {
    const oldAct = activos.find(x => x.id === oldA.activoId);
    resumenHTML = `
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center">
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#991b1b;margin-bottom:6px">Sale</div>
          <div style="font-size:13px;font-weight:700;color:#0f172a">${oldAct ? esc(oldAct.marca) + ' ' + esc(oldAct.modelo) : '—'}</div>
          <div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px">${esc(oldA.serieAsignada || '—')}</div>
        </div>
        <div style="font-size:24px;color:#ea580c">→</div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#1e40af;margin-bottom:6px">Entra</div>
          <div style="font-size:13px;font-weight:700;color:#0f172a">${esc(newI.marca)} ${esc(newI.modelo)}</div>
          <div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px">${esc(newI.serie || '—')}</div>
        </div>
      </div>`;
  }

  openModal('', `
    <div style="display:flex;flex-direction:column;gap:0">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:14px;padding-bottom:14px;border-bottom:2px solid #fed7aa;margin-bottom:16px">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#f97316,#ea580c);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;box-shadow:0 4px 12px rgba(234,88,12,.25)">🔁</div>
        <div>
          <h2 style="margin:0;font-size:18px;font-weight:800;color:#0f172a">Reemplazo de Equipo</h2>
          <div style="font-size:12px;color:#64748b;margin-top:2px">Sustituir un equipo asignado por uno del stock disponible</div>
        </div>
      </div>

      <!-- Steps indicator -->
      <div style="display:flex;gap:20px;margin-bottom:18px;padding:10px 16px;background:#f8fafc;border-radius:8px">
        ${step(1, 'Ticket', currentStep===1, currentStep>1)}
        <div style="flex:1;border-bottom:1px dashed #cbd5e1;margin-bottom:8px"></div>
        ${step(2, 'Colaborador', currentStep===2, currentStep>2)}
        <div style="flex:1;border-bottom:1px dashed #cbd5e1;margin-bottom:8px"></div>
        ${step(3, 'Equipo a reemplazar', currentStep===3, currentStep>3)}
        <div style="flex:1;border-bottom:1px dashed #cbd5e1;margin-bottom:8px"></div>
        ${step(4, 'Equipo nuevo', currentStep===4, currentStep>4)}
      </div>

      <!-- 1. Ticket -->
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;display:flex;align-items:center;gap:6px"><span style="background:#ea580c;color:#fff;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800">1</span> Información del Ticket</div>
        <div class="form-grid">
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Fecha</label>
            <div style="position:relative">
              <input type="date" class="form-control" id="reemFecha" value="${today()}" style="padding-right:36px;height:36px;font-size:12px">
              <span onclick="document.getElementById('reemFecha').showPicker()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:14px">📅</span>
            </div>
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">N° Ticket <span class="required">*</span></label>
            <input class="form-control" id="reemTicket" placeholder="REQ000000" style="height:36px;font-size:12px">
          </div>
        </div>
      </div>

      <!-- 2. Colaborador -->
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;display:flex;align-items:center;gap:6px"><span style="background:${c ? '#10b981' : currentStep>=2 ? '#ea580c' : '#e2e8f0'};color:#fff;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800">${c ? '✓' : '2'}</span> Buscar Colaborador</div>
        <div style="display:flex;gap:10px;align-items:center">
          <div style="flex:1;position:relative">
            <input class="form-control" id="reemUserSearch" placeholder="Buscar por nombre, DNI o correo..." oninput="_reemBuscarColab(this.value)" autocomplete="off" value="${c ? esc(c.nombre) : ''}" style="height:36px;font-size:12px">
            <div id="reemUserResults" style="position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;max-height:160px;overflow-y:auto;z-index:10;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.1)"></div>
          </div>
          ${c ? `<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">${esc((c.nombre||'').split(' ').map(p=>p[0]).slice(0,2).join(''))}</div>
            <div style="font-size:11px;line-height:1.3"><strong>${esc(c.nombre)}</strong><br><span style="color:#64748b">${esc(c.email||'')} · ${esc(c.area||'')}</span></div>
          </div>` : ''}
        </div>
      </div>

      <!-- 3. Equipos asignados -->
      ${c ? `<div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;display:flex;align-items:center;gap:6px"><span style="background:${oldA ? '#10b981' : '#ea580c'};color:#fff;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800">${oldA ? '✓' : '3'}</span> Activos asignados al usuario</div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 10px;font-size:11px;color:#92400e;margin-bottom:8px">Seleccione el equipo que será reemplazado</div>
        ${equiposHTML}
      </div>` : ''}

      <!-- 4. Stock disponible -->
      ${oldA ? `<div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;display:flex;align-items:center;gap:6px"><span style="background:${newI ? '#10b981' : '#ea580c'};color:#fff;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800">${newI ? '✓' : '4'}</span> Equipo nuevo (Stock ${esc(activos.find(x=>x.id===oldA.activoId)?.tipo || '')})</div>
        ${stockHTML}
      </div>` : ''}

      <!-- 5. Motivo y Observaciones -->
      ${oldA && newI ? `
      <div style="margin-bottom:16px">
        <div class="form-grid">
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Motivo del Reemplazo <span class="required">*</span></label>
            <select class="form-control" id="reemMotivo" style="height:36px;font-size:12px">
              <option value="">Seleccionar...</option>
              ${_REEM_MOTIVOS.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Observaciones</label>
            <input class="form-control" id="reemObs" placeholder="Opcional..." style="height:36px;font-size:12px">
          </div>
        </div>
      </div>

      <!-- Resumen visual -->
      <div style="margin-bottom:4px">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Resumen del Reemplazo</div>
        ${resumenHTML}
      </div>
      ` : ''}
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    ${oldA && newI ? '<button class="btn btn-primary" onclick="_ejecutarReemplazo()" style="background:#ea580c;border-color:#ea580c">Confirmar Reemplazo</button>' : ''}
  `, 'modal-lg');

  // Focus en buscador si no hay colab
  if (!c) { const el = document.getElementById('reemUserSearch'); if (el) el.focus(); }
}

let _reemBuscarTimer = null;
function _reemBuscarColab(val) {
  clearTimeout(_reemBuscarTimer);
  _reemBuscarTimer = setTimeout(() => {
    const box = document.getElementById('reemUserResults');
    if (!box) return;
    if (!val || val.length < 2) { box.style.display = 'none'; return; }
    const colabs = DB.get('colaboradores').filter(c => c.estado === 'Activo');
    const s = val.toLowerCase();
    const found = colabs.filter(c => (c.nombre||'').toLowerCase().includes(s) || (c.dni||'').toLowerCase().includes(s) || (c.email||'').toLowerCase().includes(s)).slice(0,8);
    if (found.length === 0) {
      box.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--text-muted)">Sin coincidencias</div>';
    } else {
      box.innerHTML = found.map(c => `
        <div style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''" onclick="_reemSelectColab(${c.id})">
          <div><strong>${esc(c.nombre)}</strong> <span style="color:#94a3b8;margin-left:4px">DNI: ${esc(c.dni)}</span></div>
          <span style="color:#64748b;font-size:11px">${esc(c.email||'')}</span>
        </div>`).join('');
    }
    box.style.display = 'block';
  }, 150);
}

function _reemSelectColab(id) {
  const c = DB.get('colaboradores').find(x => x.id === id);
  if (!c) return;
  _reemColab = c;
  _reemOldAsig = null;
  _reemNewItem = null;
  _renderReemplazoModal();
}

function _reemSelectOld(asigId) {
  const a = DB.get('asignaciones').find(x => x.id === asigId);
  if (!a) return;
  _reemOldAsig = a;
  _reemNewItem = null;
  _renderReemplazoModal();
}

function _reemSelectNew(idx) {
  const stock = window._reemStockFiltered || [];
  const item = stock[idx];
  if (!item) return;
  _reemNewItem = item;
  _renderReemplazoModal();
}

function _reemRefreshStock() {
  // Re-render solo la sección de stock manteniendo estado
  _renderReemplazoModal();
}

function _ejecutarReemplazo() {
  const ticket = (document.getElementById('reemTicket') || {}).value.trim();
  const fechaInput = (document.getElementById('reemFecha') || {}).value;
  const motivo = (document.getElementById('reemMotivo') || {}).value;
  const obs = (document.getElementById('reemObs') || {}).value.trim();

  if (!ticket) { showToast('Ingrese el número de ticket', 'error'); return; }
  if (!motivo) { showToast('Seleccione el motivo del reemplazo', 'error'); return; }
  if (!_reemColab || !_reemOldAsig || !_reemNewItem) return;

  const now = new Date();
  const fecha = (fechaInput || today()) + 'T' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');

  const activos = DB.get('activos');
  const asig = DB.get('asignaciones');
  const colab = _reemColab;

  // 1. Devolver equipo viejo
  const oldRec = asig.find(x => x.id === _reemOldAsig.id);
  if (oldRec) {
    oldRec.estado = 'Devuelto';
    const oldActivo = activos.find(x => x.id === oldRec.activoId);
    if (oldActivo) {
      const otrasVigentes = asig.filter(o => o.activoId === oldRec.activoId && o.estado === 'Vigente' && o.id !== oldRec.id).length;
      if (otrasVigentes === 0) {
        oldActivo.estado = 'Disponible';
        oldActivo.estadoEquipo = 'USADO';
        oldActivo.responsable = '';
      }
    }
  }

  // 2. Asignar equipo nuevo
  const newActivo = activos.find(a => a.id === _reemNewItem.activoId);
  if (newActivo) {
    asig.push(upperFields({
      id: nextId(asig),
      activoId: newActivo.id,
      activoCodigo: newActivo.codigo,
      activoTipo: newActivo.tipo,
      activoMarca: newActivo.marca,
      activoModelo: newActivo.modelo,
      serieAsignada: _reemNewItem.serie || '',
      colaboradorId: colab.id,
      colaboradorNombre: colab.nombre,
      correoColab: colab.email || '',
      area: colab.area,
      fechaAsignacion: fecha,
      tipoAsignacion: 'Reemplazo',
      motivo: 'REEMPLAZO - ' + motivo,
      ticket: ticket.toUpperCase(),
      estado: 'Vigente',
      observaciones: obs
    }));

    // Actualizar estado del nuevo activo
    const totalSeries = (newActivo.series || []).length;
    const seriesAsig = asig.filter(a => a.activoId === newActivo.id && a.estado === 'Vigente').length;
    if (totalSeries === 0 || seriesAsig >= totalSeries) {
      newActivo.estado = 'Asignado';
    }
    newActivo.responsable = colab.nombre;
  }

  DB.set('activos', activos);
  DB.set('asignaciones', asig);
  addMovimiento('Reemplazo', `${_reemOldAsig.serieAsignada || '—'} → ${_reemNewItem.serie || '—'} para ${colab.nombre} [${ticket}] — ${motivo}`);

  // Auto-registrar en bitácora: INGRESO del equipo viejo devuelto
  const _oldAct = activos.find(a => a.id === (_reemOldAsig ? _reemOldAsig.activoId : 0));
  if (_oldAct) {
    _autoBitacora({
      movimiento: 'INGRESO',
      almacen: (_oldAct.ubicacion || 'Almacen TI'),
      tipoEquipo: _oldAct.tipo || '',
      equipo: _oldAct.equipo || _oldAct.tipo || '',
      modelo: _oldAct.modelo || '',
      serie: _reemOldAsig.serieAsignada || '',
      inv: _oldAct.codInventario || '',
      correo: colab.email || '',
      ticket: ticket || '',
      motivo: motivo || 'REEMPLAZO'
    });
  }
  // SALIDA del equipo nuevo asignado
  const _newAct = activos.find(a => a.id === (_reemNewItem ? _reemNewItem.activoId : 0));
  if (_newAct) {
    _autoBitacora({
      movimiento: 'SALIDA',
      almacen: (_newAct.ubicacion || 'Almacen TI'),
      tipoEquipo: _newAct.tipo || '',
      equipo: _newAct.equipo || _newAct.tipo || '',
      modelo: _newAct.modelo || '',
      serie: _reemNewItem.serie || '',
      inv: _newAct.codInventario || '',
      correo: colab.email || '',
      ticket: ticket || '',
      motivo: motivo || 'REEMPLAZO'
    });
  }

  closeModal();
  showToast('Reemplazo realizado correctamente');
  _reemColab = null; _reemOldAsig = null; _reemNewItem = null;
  renderAsignacion(document.getElementById('contentArea'));
}

let _stockFilterTipo = 'Todos';
let _stockSearchText = '';

function openStockModal() {
  const activos = DB.get('activos');
  const asignaciones = DB.get('asignaciones');
  // Series currently assigned (vigentes) — normalizar a UPPERCASE para comparación
  const seriesAsignadas = new Set(
    asignaciones.filter(a => a.estado === 'Vigente').map(a => a.activoId + '||' + (a.serieAsignada || '').toUpperCase().trim())
  );
  const stock = [];
  activos.forEach(a => {
    // Skip activos en Baja, No Recuperable, Dado de Baja, En Mantenimiento
    const estadoUp = (a.estado || '').toUpperCase();
    if (estadoUp === 'BAJA' || estadoUp === 'NO RECUPERABLE' || estadoUp === 'DADO DE BAJA' || estadoUp === 'EN MANTENIMIENTO') return;
    const series = a.series || [];
    // Solo mostrar activos que tengan series con stock
    if (series.length === 0) return;
    series.forEach(s => {
      // Solo mostrar series que no estén asignadas (vigentes)
      const key = a.id + '||' + (s.serie || '').toUpperCase().trim();
      if (!seriesAsignadas.has(key)) {
        stock.push({ activoId: a.id, tipo: (a.tipo || '').toUpperCase().trim(), equipo: (a.equipo || a.tipo || '').toUpperCase().trim(), marca: a.marca, modelo: a.modelo, serie: s.serie || '', codInventario: s.codInventario || '', estadoEquipo: a.estadoEquipo || '' });
      }
    });
  });

  _stockFilterTipo = 'Todos';
  _stockSearchText = '';
  window._stockData = stock;

  const tipos = ['Todos', ...new Set(stock.map(r => r.tipo))];

  // Save current form values before replacing modal content
  window._stockSavedFormValues = {
    ticket: (document.getElementById('fAsigTicket') || {}).value || '',
    motivo: (document.getElementById('fAsigMotivo') || {}).value || '',
    userSearch: (document.getElementById('fAsigUserSearch') || {}).value || ''
  };

  const parentBody = document.getElementById('modalBody').innerHTML;
  const parentFooter = document.getElementById('modalFooter').innerHTML;
  const parentTitle = document.querySelector('#modalOverlay .modal-header h2');
  const origTitle = parentTitle ? parentTitle.textContent : '';
  if (parentTitle) parentTitle.textContent = 'Seleccionar del Stock Disponible';

  window._stockParentBody = parentBody;
  window._stockParentFooter = parentFooter;
  window._stockParentTitle = origTitle;
  window._stockTipos = tipos;

  _renderStockModalContent();

  document.getElementById('modalFooter').innerHTML = '';
}

function _renderStockModalContent() {
  const tipos = window._stockTipos || ['Todos'];
  const stock = window._stockData || [];

  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;gap:10px;align-items:center">
        <select class="form-control" style="min-width:160px;max-width:200px;font-size:12px"
                onchange="_stockFilterTipo=this.value;_renderStockModalContent()">
          ${tipos.map(t => `
            <option value="${esc(t)}" ${_stockFilterTipo === t ? 'selected' : ''}>
              ${esc(t)}${t !== 'Todos' ? ` (${stock.filter(r => r.tipo === t).length})` : ` (${stock.length})`}
            </option>
          `).join('')}
        </select>
        <div class="search-box" style="margin:0;flex:1">
          <span class="search-icon">🔍</span>
          <input type="text" id="stockSearchInput" placeholder="Buscar marca, modelo, serie..."
                 value="${esc(_stockSearchText)}"
                 oninput="_stockSearchText=this.value;_renderStockModalContent()">
        </div>
        <button class="btn btn-secondary" onclick="_closeStockModal()" style="font-size:12px;padding:6px 14px">Volver</button>
        <button class="btn btn-primary" onclick="_confirmStockSelection()" style="font-size:12px;padding:6px 14px">+ Agregar seleccionados</button>
      </div>
      <div id="stockTableWrap" style="overflow-x:auto;max-height:350px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
        ${_renderStockTable()}
      </div>
    </div>
  `;

  // Re-focus search input
  const inp = document.getElementById('stockSearchInput');
  if (inp && _stockSearchText) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}

function _renderStockTable() {
  const stock = window._stockData || [];
  let filtered = stock;

  if (_stockFilterTipo !== 'Todos') {
    filtered = filtered.filter(r => r.tipo === _stockFilterTipo);
  }
  if (_stockSearchText) {
    const s = _stockSearchText.toLowerCase();
    filtered = filtered.filter(r =>
      r.equipo.toLowerCase().includes(s) || r.marca.toLowerCase().includes(s) ||
      r.modelo.toLowerCase().includes(s) || r.serie.toLowerCase().includes(s) ||
      r.codInventario.toLowerCase().includes(s)
    );
  }

  if (filtered.length === 0) return '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">No hay equipos disponibles</div>';

  // Map filtered back to original indices for checkbox data-idx
  const stockAll = window._stockData || [];

  return `<table style="width:100%;font-size:12px">
    <thead>
      <tr>
        <th style="padding:8px 6px;background:var(--bg-secondary);width:36px;text-align:center;position:sticky;top:0">
          <input type="checkbox" id="stockSelectAll" onchange="document.querySelectorAll('.stock-check').forEach(cb=>cb.checked=this.checked)">
        </th>
        <th style="padding:8px 6px;background:var(--bg-secondary);position:sticky;top:0">Tipo Equipo</th>
        <th style="padding:8px 6px;background:var(--bg-secondary);position:sticky;top:0">Equipo</th>
        <th style="padding:8px 6px;background:var(--bg-secondary);position:sticky;top:0">Marca</th>
        <th style="padding:8px 6px;background:var(--bg-secondary);position:sticky;top:0">Modelo</th>
        <th style="padding:8px 6px;background:var(--bg-secondary);position:sticky;top:0">Serie</th>
        <th style="padding:8px 6px;background:var(--bg-secondary);position:sticky;top:0">Inv.</th>
        <th style="padding:8px 6px;background:var(--bg-secondary);position:sticky;top:0">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${filtered.map(r => {
        const origIdx = stockAll.indexOf(r);
        const checked = _asigSelectedActivos.some(x => x.activoId === r.activoId && x.serie === r.serie);
        return `<tr>
          <td style="padding:6px;text-align:center"><input type="checkbox" class="stock-check" data-idx="${origIdx}" ${checked ? 'checked' : ''}></td>
          <td style="padding:6px">${esc(r.tipo)}</td>
          <td style="padding:6px">${esc(r.equipo)}</td>
          <td style="padding:6px">${esc(r.marca)}</td>
          <td style="padding:6px">${esc(r.modelo)}</td>
          <td style="padding:6px;font-family:monospace;font-size:11px">${esc(r.serie || '—')}</td>
          <td style="padding:6px;font-family:monospace;font-size:11px">${esc(r.codInventario || '—')}</td>
          <td style="padding:6px"><span class="badge badge-success" style="font-size:9px">Disponible</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function _closeStockModal() {
  if (window._stockParentBody) {
    const title = document.querySelector('#modalOverlay .modal-header h2');
    if (title) title.textContent = window._stockParentTitle;
    document.getElementById('modalBody').innerHTML = window._stockParentBody;
    document.getElementById('modalFooter').innerHTML = window._stockParentFooter;

    // Restore saved form values
    const saved = window._stockSavedFormValues;
    if (saved) {
      const elTicket = document.getElementById('fAsigTicket');
      const elMotivo = document.getElementById('fAsigMotivo');
      const elSearch = document.getElementById('fAsigUserSearch');
      if (elTicket) elTicket.value = saved.ticket;
      if (elMotivo) elMotivo.value = saved.motivo;
      if (elSearch) elSearch.value = saved.userSearch;
      // Re-show activos section if motivo was selected (preserve state from stock modal)
      _onMotivoAsigChange(true);
      // Restore collaborator confirm display
      if (_asigSelectedColab) {
        const confirm = document.getElementById('asigUserConfirm');
        if (confirm) confirm.innerHTML = `<span style="color:var(--text-primary);font-weight:500">${esc(_asigSelectedColab.nombre)}</span> — <span style="color:var(--primary)">${esc(_asigSelectedColab.email || 'Sin correo')}</span>`;
      }
      // Restore activos list
      _refreshAsigActivosList();
    }
  }
}

function _confirmStockSelection() {
  const checks = document.querySelectorAll('.stock-check:checked');
  const stock = window._stockData || [];
  const nuevos = [...checks].map(cb => stock[parseInt(cb.dataset.idx)]).filter(Boolean);

  // Merge: add new selections without duplicates
  nuevos.forEach(n => {
    const yaExiste = _asigSelectedActivos.some(x => x.activoId === n.activoId && x.serie === n.serie);
    if (!yaExiste) _asigSelectedActivos.push(n);
  });

  _closeStockModal();

  // Update the activos list in the parent modal
  _refreshAsigActivosList();
}

function _refreshAsigActivosList() {
  const list = document.getElementById('asigActivosList');
  if (!list) return;
  const counter = document.getElementById('asigActivosCount');
  if (counter) counter.textContent = _asigSelectedActivos.length > 0 ? `(${_asigSelectedActivos.length})` : '';

  if (_asigSelectedActivos.length === 0) {
    list.innerHTML = '<span style="color:var(--text-muted)">No se han seleccionado activos. Use "Agregar del Stock" para añadir.</span>';
    list.style.textAlign = 'center';
    list.style.padding = '12px';
  } else {
    list.style.textAlign = 'left';
    list.style.padding = '0';
    list.innerHTML = `
      <table style="width:100%;font-size:12px;text-align:left">
        <thead><tr>
          <th style="padding:6px;font-size:11px">Tipo</th>
          <th style="padding:6px;font-size:11px">Equipo</th>
          <th style="padding:6px;font-size:11px">Marca</th>
          <th style="padding:6px;font-size:11px">Modelo</th>
          <th style="padding:6px;font-size:11px">Serie</th>
          <th style="padding:6px;font-size:11px;width:30px"></th>
        </tr></thead>
        <tbody>
          ${_asigSelectedActivos.map((r, i) => `
            <tr>
              <td style="padding:4px 6px">${esc(r.tipo)}</td>
              <td style="padding:4px 6px">${esc(r.equipo)}</td>
              <td style="padding:4px 6px">${esc(r.marca)}</td>
              <td style="padding:4px 6px">${esc(r.modelo)}</td>
              <td style="padding:4px 6px;font-family:monospace;font-size:11px">${esc(r.serie || '—')}</td>
              <td style="padding:4px 6px"><button class="btn-icon" style="width:22px;height:22px;font-size:10px;border:none;color:#ef4444" onclick="_asigSelectedActivos.splice(${i},1);_refreshAsigActivosList()">✕</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

function saveAsignacion() {
  const fechaInput = (document.getElementById('fAsigFecha') || {}).value || _asigFecha || today();
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const fecha = fechaInput + 'T' + hh + ':' + mi + ':' + ss;
  const ticket = ((document.getElementById('fAsigTicket') || {}).value || _asigTicket).trim();
  const motivo = (document.getElementById('fAsigMotivo') || {}).value || _asigMotivo;
  const obs = ((document.getElementById('fAsigObs') || {}).value || _asigObs || '').trim();
  const _motSaveUp = (motivo || '').toUpperCase();
  const isReposicionDano = _motSaveUp.includes('REPOSICIÓN DAÑO FÍSICO') || _motSaveUp.includes('REPOSICION DANO FISICO');
  const isReposicionRobo = _motSaveUp.includes('REPOSICIÓN ROBO') || _motSaveUp.includes('REPOSICION ROBO');
  const isReemplazo = _motSaveUp.includes('REEMPLAZO') || _motSaveUp.includes('RENOVACIÓN') || _motSaveUp.includes('RENOVACION') || isReposicionDano || isReposicionRobo;
  const isRenovacion = _motSaveUp.includes('RENOVACIÓN') || _motSaveUp.includes('RENOVACION');
  const isPrestamo = _motSaveUp.includes('PRÉSTAMO') || _motSaveUp.includes('PRESTAMO');
  const isIngresoNuevo = _motSaveUp.includes('INGRESO NUEVO');
  const fechaFinPrestamo = isPrestamo ? ((document.getElementById('fAsigFechaPrestamo') || {}).value || _asigFechaPrestamo || '') : '';

  if (!ticket) { showToast('Ingrese el número de ticket', 'error'); return; }
  if (!_asigSelectedColab) { showToast('Seleccione un colaborador', 'error'); return; }
  if (!motivo) { showToast('Seleccione el motivo de asignación', 'error'); return; }
  if (isPrestamo && !fechaFinPrestamo) { showToast('Ingrese la fecha fin de préstamo', 'error'); return; }
  if (isPrestamo && fechaFinPrestamo < today()) { showToast('La fecha fin de préstamo debe ser mayor o igual a hoy', 'error'); return; }
  if (isReemplazo && !_asigReemOld) { showToast(isReposicionRobo ? 'Seleccione el equipo robado' : isReposicionDano ? 'Seleccione el equipo dañado a retirar' : 'Seleccione el equipo a reemplazar', 'error'); return; }
  if (_asigSelectedActivos.length === 0) { showToast('Seleccione al menos un equipo principal' + (isReemplazo ? ' nuevo' : ''), 'error'); return; }

  const activos = DB.get('activos');
  const asig = DB.get('asignaciones');
  const colab = _asigSelectedColab;

  // ── REEMPLAZO / RENOVACIÓN: marcar equipo viejo como pendiente de retorno ──
  if (isReemplazo && _asigReemOld) {
    const oldRec = asig.find(a => a.id === _asigReemOld.id);
    if (oldRec) {
      oldRec.pendienteRetorno = true;
      oldRec.fechaReemplazo = fecha;
      oldRec.motivoReemplazo = isReposicionRobo ? 'REPOSICIÓN ROBO' : isReposicionDano ? 'REPOSICIÓN DAÑO FÍSICO' : isRenovacion ? 'RENOVACIÓN' : 'REEMPLAZO';
      oldRec.ticketReemplazo = ticket.toUpperCase();
    }
  }

  // ── Asignar nuevo(s) equipo(s) ──
  _asigSelectedActivos.forEach(sel => {
    const activo = activos.find(a => a.id === sel.activoId);
    if (!activo) return;

    asig.push(upperFields({
      id: nextId(asig),
      activoId: activo.id,
      activoCodigo: activo.codigo,
      activoTipo: activo.tipo,
      activoMarca: activo.marca,
      activoModelo: activo.modelo,
      serieAsignada: sel.serie || '',
      colaboradorId: colab.id,
      colaboradorNombre: colab.nombre,
      correoColab: colab.email || '',
      area: colab.area,
      fechaAsignacion: fecha || today(),
      tipoAsignacion: motivo,
      motivo: motivo,
      ticket: ticket.toUpperCase(),
      observaciones: obs,
      estado: 'Vigente',
      fechaFinPrestamo: isPrestamo ? fechaFinPrestamo : ''
    }));
  });

  // Actualizar estado de cada activo nuevo: solo 'Asignado' si TODAS sus series están asignadas
  const activoIds = [...new Set(_asigSelectedActivos.map(s => s.activoId))];
  activoIds.forEach(aid => {
    const activo = activos.find(a => a.id === aid);
    if (!activo) return;
    const totalSeries = (activo.series || []).length;
    const seriesAsignadas = asig.filter(a => a.activoId === aid && a.estado === 'Vigente').length;
    if (totalSeries === 0 || seriesAsignadas >= totalSeries) {
      activo.estado = 'Asignado';
    }
    activo.responsable = colab.nombre;
  });

  // ── INGRESO NUEVO: Validar máximo 1 accesorio por tipo ──
  if (isIngresoNuevo && _asigSelectedAccesorios.length > 0) {
    const _accTipoCount = {};
    let _accDup = null;
    _asigSelectedAccesorios.forEach(sel => {
      const t = (sel.equipo || sel.tipo || '').toUpperCase();
      _accTipoCount[t] = (_accTipoCount[t] || 0) + 1;
      if (_accTipoCount[t] > 1 && !_accDup) _accDup = t;
    });
    if (_accDup) {
      showToast('Solo se permite 1 accesorio por tipo. Tienes duplicado: ' + _accDup, 'error');
      return;
    }
  }

  // ── INGRESO NUEVO: Asignar accesorios ergonómicos (ADIC-ERG) ──
  if (isIngresoNuevo && _asigSelectedAccesorios.length > 0) {
    _asigSelectedAccesorios.forEach(sel => {
      const activo = activos.find(a => a.id === sel.activoId);
      if (!activo) return;

      asig.push(upperFields({
        id: nextId(asig),
        activoId: activo.id,
        activoCodigo: activo.codigo,
        activoTipo: activo.tipo,
        activoMarca: activo.marca,
        activoModelo: activo.modelo,
        serieAsignada: sel.serie || '',
        colaboradorId: colab.id,
        colaboradorNombre: colab.nombre,
        correoColab: colab.email || '',
        area: colab.area,
        fechaAsignacion: fecha || today(),
        tipoAsignacion: motivo,
        motivo: motivo,
        ticket: ticket.toUpperCase(),
        observaciones: obs,
        estado: 'Vigente',
        fechaFinPrestamo: ''
      }));
    });

    // Actualizar estado de activos accesorios
    const accActivoIds = [...new Set(_asigSelectedAccesorios.map(s => s.activoId))];
    accActivoIds.forEach(aid => {
      const activo = activos.find(a => a.id === aid);
      if (!activo) return;
      const totalSeries = (activo.series || []).length;
      const seriesAsignadas = asig.filter(a => a.activoId === aid && a.estado === 'Vigente').length;
      if (totalSeries === 0 || seriesAsignadas >= totalSeries) {
        activo.estado = 'Asignado';
      }
      activo.responsable = colab.nombre;
    });
  }

  DB.set('activos', activos);
  DB.set('asignaciones', asig);

  const _totalEquipos = _asigSelectedActivos.length + (isIngresoNuevo ? _asigSelectedAccesorios.length : 0);

  if (isReemplazo) {
    const _movTipo = isReposicionRobo ? 'Reposición Robo' : isReposicionDano ? 'Reposición Daño Físico' : isRenovacion ? 'Renovación' : 'Reemplazo';
    addMovimiento(_movTipo, `${_movTipo} de equipo para ${colab.nombre} [${ticket}]`);
  } else if (isIngresoNuevo) {
    addMovimiento('Ingreso Nuevo', `${_totalEquipos} activo(s) asignados (kit inicial) a ${colab.nombre} [${ticket}]`);
  } else {
    addMovimiento(isPrestamo ? 'Préstamo' : 'Asignación', isPrestamo ? `${_asigSelectedActivos.length} activo(s) en préstamo a ${colab.nombre} hasta ${formatDate(fechaFinPrestamo)} [${ticket}]` : `${_asigSelectedActivos.length} activo(s) asignados a ${colab.nombre} [${ticket}]`);
  }

  // Auto-registrar en bitácora estructurada (SALIDA por cada activo asignado)
  _asigSelectedActivos.forEach(sel => {
    const _act = activos.find(a => a.id === sel.activoId);
    if (!_act) return;
    _autoBitacora({
      movimiento: 'SALIDA',
      almacen: (_act.ubicacion || 'Almacen TI'),
      tipoEquipo: _act.tipo || '',
      equipo: _act.equipo || _act.tipo || '',
      modelo: _act.modelo || '',
      serie: sel.serie || '',
      inv: _act.codInventario || '',
      correo: colab.email || '',
      ticket: ticket || '',
      motivo: _motSaveUp.includes('REEMPLAZO') || _motSaveUp.includes('RENOVACIÓN') || _motSaveUp.includes('RENOVACION') || _motSaveUp.includes('PRÉSTAMO') || _motSaveUp.includes('PRESTAMO') || isReposicionDano || isReposicionRobo ? motivo : ''
    });
  });

  // Bitácora SALIDA para accesorios (Ingreso Nuevo)
  if (isIngresoNuevo && _asigSelectedAccesorios.length > 0) {
    _asigSelectedAccesorios.forEach(sel => {
      const _act = activos.find(a => a.id === sel.activoId);
      if (!_act) return;
      _autoBitacora({
        movimiento: 'SALIDA',
        almacen: (_act.ubicacion || 'Almacen TI'),
        tipoEquipo: _act.tipo || '',
        equipo: _act.equipo || _act.tipo || '',
        modelo: _act.modelo || '',
        serie: sel.serie || '',
        inv: _act.codInventario || '',
        correo: colab.email || '',
        ticket: ticket || '',
        motivo: ''
      });
    });
  }

  closeModal();
  showToast(isIngresoNuevo ? `Kit inicial (${_totalEquipos} activo(s)) asignado correctamente` : isReposicionRobo ? 'Reposición por robo registrada correctamente' : isReposicionDano ? 'Reposición por daño físico realizada correctamente' : isReemplazo ? (isRenovacion ? 'Renovación realizada correctamente' : 'Reemplazo realizado correctamente') : isPrestamo ? 'Préstamo registrado correctamente' : `${_asigSelectedActivos.length} activo(s) asignados correctamente`);
  _asigSelectedColab = null;
  _asigSelectedActivos = [];
  _asigSelectedAccesorios = [];
  _asigReemOld = null;
  _asigFechaPrestamo = '';
  _asigAccSearch = '';
  _asigAccTipo = 'Todos';
  _asigAccPage = 0;
  renderAsignacion(document.getElementById('contentArea'));
}

function previewActaEntrega(asigId) {
  const asignaciones = DB.get('asignaciones');
  const record = asignaciones.find(x => x.id === asigId);
  if (!record) return;

  // Group all activos from the same assignment (same ticket + collaborador + fecha)
  const grupo = asignaciones.filter(a =>
    a.ticket === record.ticket &&
    a.colaboradorId === record.colaboradorId &&
    a.fechaAsignacion === record.fechaAsignacion
  );

  // Get collaborator data
  const colabs = DB.get('colaboradores');
  const colab = colabs.find(c => c.id === record.colaboradorId) || {};

  // Get activo details for specs (first laptop/pc)
  const activos = DB.get('activos');
  const activoPrincipal = activos.find(a => a.id === grupo[0].activoId) || {};

  const isReposicion = (record.tipoAsignacion || '').toLowerCase().includes('reemplazo') ||
                       (record.tipoAsignacion || '').toLowerCase().includes('renovación') ||
                       (record.tipoAsignacion || '').toLowerCase().includes('reposición daño físico') ||
                       (record.tipoAsignacion || '').toLowerCase().includes('reposición robo');

  // Build equipment rows (up to 4)
  let equipRows = '';
  for (let i = 0; i < 4; i++) {
    const g = grupo[i];
    if (g) {
      const inv = g.serieAsignada ? (activos.find(a => a.id === g.activoId)?.series?.find(s => s.serie === g.serieAsignada)?.codInventario || '') : '';
      equipRows += `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${esc(g.activoTipo || '')} ${esc((activos.find(a=>a.id===g.activoId)||{}).equipo || '')}</td>
        <td>${esc(g.activoMarca || '')}</td>
        <td>${esc(g.activoModelo || '')}</td>
        <td>${esc(g.serieAsignada || 'N/A')}</td>
        <td>${esc(inv || 'N/A')}</td>
      </tr>`;
    } else {
      equipRows += `<tr><td style="text-align:center">${i + 1}</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }
  }

  const fechaEntrega = formatDate(record.fechaAsignacion);

  // Seccion equipo a devolver (reemplazo)
  let devSection = '';
  if (isReposicion) {
    const _allAsig = DB.get('asignaciones');
    const _devueltos = _allAsig.filter(a =>
      a.colaboradorId === record.colaboradorId &&
      (a.ticketReemplazo === record.ticket || a.ticketCese === record.ticket) &&
      (a.pendienteRetorno || (a.estado === 'Devuelto' && (a.motivoCese === 'REEMPLAZO' || a.motivoCese === 'RENOVACIÓN' || a.motivoCese === 'REPOSICIÓN DAÑO FÍSICO' || a.motivoCese === 'REPOSICIÓN ROBO')))
    );
    if (_devueltos.length > 0) {
      let devRows = '';
      for (let i = 0; i < 4; i++) {
        const d = _devueltos[i];
        if (d) {
          const dInv = d.serieAsignada ? (activos.find(a => a.id === d.activoId)?.series?.find(s => s.serie === d.serieAsignada)?.codInventario || '') : '';
          devRows += '<tr><td style="text-align:center">' + (i+1) + '</td><td>' + esc(d.activoTipo || '') + '</td><td>' + esc(d.activoMarca || '') + '</td><td>' + esc(d.activoModelo || '') + '</td><td>' + esc(d.serieAsignada || 'N/A') + '</td><td>' + esc(dInv || 'N/A') + '</td></tr>';
        } else {
          devRows += '<tr><td style="text-align:center">' + (i+1) + '</td><td></td><td></td><td></td><td></td><td></td></tr>';
        }
      }
      devSection = '<div style="font-weight:700;font-size:11px;padding:5px 8px;background:#fef2f2;border:1px solid #e2e8f0;border-top:none;color:#991b1b">DATOS DEL EQUIPO A DEVOLVER (EQUIPO ANTERIOR)</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#fef2f2"><th style="border:1px solid #e2e8f0;padding:5px 6px;font-size:10px;text-align:center;color:#991b1b">ITEM</th><th style="border:1px solid #e2e8f0;padding:5px 6px;font-size:10px;text-align:center;color:#991b1b">EQUIPO</th><th style="border:1px solid #e2e8f0;padding:5px 6px;font-size:10px;text-align:center;color:#991b1b">MARCA</th><th style="border:1px solid #e2e8f0;padding:5px 6px;font-size:10px;text-align:center;color:#991b1b">MODELO</th><th style="border:1px solid #e2e8f0;padding:5px 6px;font-size:10px;text-align:center;color:#991b1b">SERIE</th><th style="border:1px solid #e2e8f0;padding:5px 6px;font-size:10px;text-align:center;color:#991b1b">INVENTARIO</th></tr></thead><tbody>' + devRows + '</tbody></table>';
    }
  }

  // Generar HTML del acta
  window._actaHTML = _buildActaPrintHTML(record, colab, grupo, activos, activoPrincipal, equipRows, devSection, isReposicion, fechaEntrega);

  // Crear blob y mostrarlo en iframe como vista previa
  const blob = new Blob([window._actaHTML], { type: 'text/html; charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const modalBody = `
    <div style="background:#525659;border-radius:var(--radius-sm);overflow:hidden;position:relative">
      <iframe id="actaIframe" src="${blobUrl}" style="width:100%;height:70vh;border:none;display:block"></iframe>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    <button class="btn" onclick="_printActaEntrega()" style="background:#3b82f6;color:#fff;border-color:#3b82f6">🖨️ Imprimir</button>
    <button class="btn" onclick="_downloadActaPDF()" style="background:#10b981;color:#fff;border-color:#10b981">📥 Descargar PDF</button>
  `;

  openModal('Acta de Asignacion de Equipos', modalBody, footer, 'modal-lg');
}

// Genera el HTML completo para imprimir/descargar como PDF
function _buildActaPrintHTML(record, colab, grupo, activos, activoPrincipal, equipRows, devSection, isReposicion, fechaEntrega) {
  // devSection para impresion (con estilos de borde negro)
  let devPrint = '';
  if (isReposicion) {
    const _allAsig = DB.get('asignaciones');
    const _devueltos = _allAsig.filter(a =>
      a.colaboradorId === record.colaboradorId &&
      (a.ticketReemplazo === record.ticket || a.ticketCese === record.ticket) &&
      (a.pendienteRetorno || (a.estado === 'Devuelto' && (a.motivoCese === 'REEMPLAZO' || a.motivoCese === 'RENOVACIÓN' || a.motivoCese === 'REPOSICIÓN DAÑO FÍSICO' || a.motivoCese === 'REPOSICIÓN ROBO')))
    );
    if (_devueltos.length > 0) {
      let devRows = '';
      for (let i = 0; i < 4; i++) {
        const d = _devueltos[i];
        if (d) {
          const dInv = d.serieAsignada ? (activos.find(a => a.id === d.activoId)?.series?.find(s => s.serie === d.serieAsignada)?.codInventario || '') : '';
          devRows += '<tr><td style="text-align:center">' + (i+1) + '</td><td>' + esc(d.activoTipo || '') + '</td><td>' + esc(d.activoMarca || '') + '</td><td>' + esc(d.activoModelo || '') + '</td><td>' + esc(d.serieAsignada || 'N/A') + '</td><td>' + esc(dInv || 'N/A') + '</td></tr>';
        } else {
          devRows += '<tr><td style="text-align:center">' + (i+1) + '</td><td></td><td></td><td></td><td></td><td></td></tr>';
        }
      }
      devPrint = '<div class="section-title" style="border-top:none">DATOS DEL EQUIPO A DEVOLVER (EQUIPO ANTERIOR)</div>' +
        '<table class="equip"><thead><tr><th>ITEM</th><th>EQUIPO</th><th>MARCA</th><th>MODELO</th><th>SERIE</th><th>INVENTARIO</th></tr></thead><tbody>' + devRows + '</tbody></table>';
    }
  }

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Acta - ${esc(record.ticket)}</title>
<style>
  @media print { body { margin: 0; } @page { size: A4; margin: 15mm; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; padding: 20px; background: #fff; }
  .acta { max-width: 780px; margin: 0 auto; }
  .header-row { display: flex; align-items: center; border: 1.5px solid #000; }
  .header-logo { width: 140px; padding: 8px 12px; display: flex; align-items: center; }
  .header-logo svg { width: 100px; }
  .header-title { flex: 1; text-align: center; font-size: 15px; font-weight: bold; padding: 10px; letter-spacing: 1px; }
  .header-code { width: 140px; text-align: center; font-weight: bold; font-size: 12px; padding: 8px; border-left: 1.5px solid #000; }
  table.form-tbl { width: 100%; border-collapse: collapse; }
  table.form-tbl td { border: 1px solid #000; padding: 4px 8px; font-size: 11px; }
  table.form-tbl .lbl { background: #f0f0f0; font-weight: bold; width: 130px; font-size: 10px; }
  table.equip { width: 100%; border-collapse: collapse; margin-top: -1px; }
  table.equip th { background: #f0f0f0; font-weight: bold; font-size: 10px; border: 1px solid #000; padding: 5px 6px; text-align: center; }
  table.equip td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; text-align: center; }
  .section-title { background: #e8e8e8; font-weight: bold; font-size: 11px; padding: 5px 8px; border: 1px solid #000; border-top: none; }
  .specs-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; border: 1px solid #000; border-top: none; }
  .specs-grid .spec-item { padding: 5px 8px; border-right: 1px solid #000; font-size: 10px; }
  .specs-grid .spec-item:last-child { border-right: none; }
  .specs-grid .spec-lbl { font-weight: bold; }
  .obs-box { border: 1px solid #000; border-top: none; padding: 6px 8px; min-height: 40px; }
  .terms { border: 1px solid #000; border-top: none; padding: 10px 12px; font-size: 9.5px; line-height: 1.5; }
  .terms-title { font-weight: bold; text-align: center; margin-bottom: 6px; font-size: 10px; }
  .terms-accept { font-weight: bold; font-style: italic; font-size: 10px; margin-top: 8px; }
  .signature-row { display: flex; border: 1px solid #000; border-top: none; }
  .signature-col { flex: 1; padding: 12px 16px; text-align: center; min-height: 80px; display: flex; flex-direction: column; justify-content: flex-end; }
  .signature-col + .signature-col { border-left: 1px solid #000; }
  .sig-line { border-top: 1px solid #000; padding-top: 4px; font-weight: bold; font-size: 10px; margin-top: auto; }
  .sig-name { font-size: 10px; color: #333; margin-top: 2px; }
</style></head><body>
<div class="acta">
  <div class="header-row">
    <div class="header-logo"><svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="30" r="18" fill="#FF6600"/><text x="22" y="36" text-anchor="middle" font-size="18" fill="#fff" font-weight="bold" font-family="Arial">e</text><text x="68" y="40" font-size="28" fill="#1a237e" font-weight="bold" font-family="Arial">entel</text></svg></div>
    <div class="header-title">ACTA DE ASIGNACION DE EQUIPOS - ${esc((record.tipoAsignacion || record.motivo || 'ASIGNACION').toUpperCase())}</div>
    <div class="header-code">FORM-26A</div>
  </div>
  <table class="form-tbl">
    <tr><td class="lbl">USUARIO:</td><td colspan="3">${esc(colab.nombre || record.colaboradorNombre)}</td><td class="lbl" style="width:100px">TICKET:</td><td style="width:160px;font-family:monospace">${esc(record.ticket || '')}</td></tr>
    <tr><td class="lbl">EMAIL:</td><td colspan="3">${esc(colab.email || record.correoColab || '')}</td><td class="lbl">FECHA ENTREGA:</td><td>${fechaEntrega}</td></tr>
    <tr><td class="lbl">CARGO:</td><td>${esc(colab.cargo || '')}</td><td class="lbl" style="width:60px">AREA:</td><td colspan="3">${esc(colab.area || record.area || '')}</td></tr>
    <tr><td class="lbl">LOCAL:</td><td colspan="5">${esc(colab.ubicacion || '')}</td></tr>
    <tr><td class="lbl">JEFE/ RESPONSABLE:</td><td colspan="3"></td><td class="lbl">ING. DE SOP:</td><td></td></tr>
  </table>
  <div class="section-title">${isReposicion ? 'DATOS DEL EQUIPO ENTREGADO (EQUIPO NUEVO)' : 'DATOS DEL EQUIPO'}</div>
  <table class="equip"><thead><tr><th>ITEM</th><th>EQUIPO</th><th>MARCA</th><th>MODELO</th><th>SERIE</th><th>INVENTARIO</th></tr></thead><tbody>${equipRows}</tbody></table>
  ${devPrint}
  <div class="section-title" style="border-top:none">ESPECIFICACIONES TECNICAS:</div>
  <div class="specs-grid">
    <div class="spec-item"><span class="spec-lbl">HOSTNAME:</span> ${esc(activoPrincipal.hostname || '')}</div>
    <div class="spec-item"><span class="spec-lbl">PROCESADOR:</span> ${esc(activoPrincipal.procesador || '')}</div>
    <div class="spec-item"><span class="spec-lbl">DISCO DURO:</span> ${esc(activoPrincipal.discoDuro || '')}</div>
    <div class="spec-item"><span class="spec-lbl">RAM:</span> ${esc(activoPrincipal.ram || '')}</div>
  </div>
  <div class="obs-box"><div style="font-weight:bold;font-size:11px;margin-bottom:4px">OBSERVACIONES:</div><div style="min-height:30px;padding-top:4px">${esc(record.motivo || '')}</div></div>
  <div class="terms">
    <div class="terms-title">Condiciones y responsabilidades sobre la asignacion de equipos</div>
    <p>1. El empleado recibe los equipos y herramientas de trabajo descritos previamente para uso exclusivo en actividades relacionadas a su trabajo para Entel.</p>
    <p>2. El uso correcto de las herramientas de trabajo se tienen que realizar conforme a las recomendaciones senaladas por SST.</p>
    <p>3. El empleado es responsable de manera integra de mantener las condiciones de seguridad adecuadas a fin de no exponer al riesgo las herramientas de trabajo.</p>
    <p>4. En caso de perdida o robo, el empleado debe realizar la denuncia policial inmediatamente y notificar a su lider y al area de Seguridad dentro de las 24 horas.</p>
    <div class="terms-accept">He leido y acepto los terminos y condiciones de la Politica de asignacion de equipos informaticos portatiles</div>
  </div>
  <div class="signature-row">
    <div class="signature-col"><div class="sig-line">Firma Usuario Entel</div></div>
    <div class="signature-col"><div class="sig-line">Usuario / DNI</div><div class="sig-name">${esc(colab.nombre || record.colaboradorNombre)}</div></div>
  </div>
</div>
</body></html>`;
}

function _printActaEntrega() {
  if (!window._actaHTML) return;
  const iframe = document.getElementById('actaIframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.print();
  } else {
    const w = window.open('', '_blank', 'width=850,height=900');
    w.document.write(window._actaHTML);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }
}

function _downloadActaPDF() {
  if (!window._actaHTML) return;
  const iframe = document.getElementById('actaIframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.print();
  }
}

function verDetalleAsignacion(ticket, colabId, fecha) {
  const asignaciones = DB.get('asignaciones');
  const grupo = asignaciones.filter(a =>
    a.ticket === ticket && a.colaboradorId === colabId && a.fechaAsignacion === fecha
  );
  if (grupo.length === 0) return;

  const first = grupo[0];
  const colabs = DB.get('colaboradores');
  const colab = colabs.find(c => c.id === colabId) || {};

  const equiposHTML = grupo.map((a, i) => `
    <tr>
      <td style="font-size:12px">${i + 1}</td>
      <td style="font-size:12px">${esc(a.activoTipo)}</td>
      <td style="font-size:12px">${esc(a.activoMarca || '')} ${esc(a.activoModelo || '')}</td>
      <td style="font-size:11px;font-family:monospace">${esc(a.serieAsignada || '—')}</td>
      <td style="font-size:11px;font-family:monospace">${esc(a.activoCodigo || '—')}</td>
      <td><span class="badge ${a.estado === 'Vigente' ? 'badge-success' : 'badge-neutral'}" style="font-size:10px">${esc(a.estado)}</span></td>
    </tr>
  `).join('');

  const _detTipoUp = (first.tipoAsignacion || first.motivo || '').toUpperCase();
  const _esReposDano = _detTipoUp.includes('REPOSICIÓN DAÑO FÍSICO') || _detTipoUp.includes('REPOSICION DANO FISICO');
  const _esReposRobo = _detTipoUp.includes('REPOSICIÓN ROBO') || _detTipoUp.includes('REPOSICION ROBO');
  const _esRenov = _detTipoUp.includes('RENOVACIÓN') || _detTipoUp.includes('RENOVACION');
  const _esReem = _detTipoUp.includes('REEMPLAZO') || _esReposDano || _esReposRobo;
  const _esPrest = _detTipoUp.includes('PRÉSTAMO') || _detTipoUp.includes('PRESTAMO');
  const _detTitle = _esReposRobo ? 'Detalle de Reposición por Robo' : _esReposDano ? 'Detalle de Reposición por Daño Físico' : _esRenov ? 'Detalle de Renovación' : _esReem ? 'Detalle de Reemplazo' : _esPrest ? 'Detalle de Préstamo' : 'Detalle de Asignación';

  openModal(_detTitle, `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--bg-secondary);padding:14px;border-radius:8px">
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Ticket</div>
          <div style="font-size:13px;font-weight:600;font-family:monospace">${esc(first.ticket)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Fecha y Hora</div>
          <div style="font-size:13px;font-weight:600">${formatDateTime(first.fechaAsignacion)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Colaborador</div>
          <div style="font-size:13px;font-weight:600">${esc(first.colaboradorNombre)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Correo</div>
          <div style="font-size:13px">${esc(first.correoColab || '—')}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Motivo</div>
          <div><span class="badge badge-info" style="font-size:11px">${esc(first.tipoAsignacion || first.motivo || '—')}</span></div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Área</div>
          <div style="font-size:13px">${esc(colab.area || first.area || '—')}</div>
        </div>
        ${_esPrest && first.fechaFinPrestamo ? `<div>
          <div style="font-size:11px;color:#b45309;margin-bottom:2px;font-weight:600">⏱️ Fecha fin de préstamo</div>
          <div style="font-size:13px;font-weight:700;color:#b45309">${formatDate(first.fechaFinPrestamo)}</div>
        </div>` : ''}
      </div>

      ${(() => {
        const _detMotUp = (first.tipoAsignacion || first.motivo || '').toUpperCase();
        const _esReposDanoD = _detMotUp.includes('REPOSICIÓN DAÑO FÍSICO') || _detMotUp.includes('REPOSICION DANO FISICO');
        const _esReposRoboD = _detMotUp.includes('REPOSICIÓN ROBO') || _detMotUp.includes('REPOSICION ROBO');
        const esReemplazo = _detMotUp.includes('REEMPLAZO') || _detMotUp.includes('RENOVACIÓN') || _detMotUp.includes('RENOVACION') || _esReposDanoD || _esReposRoboD;
        // Buscar equipo reportado por este reemplazo/reposición (pendienteRetorno o ya devuelto)
        const devueltos = esReemplazo ? asignaciones.filter(a =>
          a.colaboradorId === colabId &&
          (a.ticketReemplazo === first.ticket || a.ticketCese === first.ticket) &&
          (a.pendienteRetorno || (a.estado === 'Devuelto' && (a.motivoCese === 'REEMPLAZO' || a.motivoCese === 'RENOVACIÓN' || a.motivoCese === 'REPOSICIÓN DAÑO FÍSICO' || a.motivoCese === 'REPOSICIÓN ROBO')))
        ) : [];

        if (esReemplazo && devueltos.length > 0) {
          const activos = DB.get('activos');
          const _eqBadge = (eq) => {
            if (!eq) return '<span class="badge badge-neutral" style="font-size:10px">—</span>';
            const up = eq.toUpperCase();
            const cls = up === 'NUEVO' ? 'badge-success' : up === 'BUENO' ? 'badge-info' : up === 'REGULAR' ? 'badge-warning' : 'badge-danger';
            return '<span class="badge ' + cls + '" style="font-size:10px">' + esc(eq) + '</span>';
          };
          return `
          <div>
            <label style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;color:#dc2626">${_esReposRoboD ? 'Equipo Robado' : _esReposDanoD ? 'Equipo Dañado (Retiro por Daño Físico)' : 'Equipo a Devolver (Equipo Anterior)'}</label>
            <div class="table-scroll">
              <table>
                <thead><tr style="background:#fef2f2">
                  <th style="color:#991b1b">Tipo</th>
                  <th style="color:#991b1b">Equipo</th>
                  <th style="color:#991b1b">Serie</th>
                  <th style="color:#991b1b">Código</th>
                  <th style="color:#991b1b">Estado Equipo</th>
                </tr></thead>
                <tbody>${devueltos.map(d => {
                  const act = activos.find(x => x.id === d.activoId);
                  return '<tr style="background:#fef2f2">' +
                  '<td style="font-size:12px">' + esc(d.activoTipo) + '</td>' +
                  '<td style="font-size:12px">' + esc(d.activoMarca || '') + ' ' + esc(d.activoModelo || '') + '</td>' +
                  '<td style="font-size:11px;font-family:monospace">' + esc(d.serieAsignada || '—') + '</td>' +
                  '<td style="font-size:11px;font-family:monospace">' + esc(d.activoCodigo || '—') + '</td>' +
                  '<td>' + _eqBadge(act ? act.estadoEquipo : '') + '</td>' +
                '</tr>';}).join('')}</tbody>
              </table>
            </div>
          </div>

          <div>
            <label style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;color:#16a34a">${_esReposDanoD ? 'Equipo de Reposición (Equipo Nuevo)' : 'Equipo Entregado (Equipo Nuevo)'}</label>
            <div class="table-scroll">
              <table>
                <thead><tr style="background:#f0fdf4">
                  <th style="color:#166534">Tipo</th>
                  <th style="color:#166534">Equipo</th>
                  <th style="color:#166534">Serie</th>
                  <th style="color:#166534">Código</th>
                  <th style="color:#166534">Estado Equipo</th>
                </tr></thead>
                <tbody>${grupo.map(a => {
                  const act = activos.find(x => x.id === a.activoId);
                  return '<tr style="background:#f0fdf4">' +
                  '<td style="font-size:12px">' + esc(a.activoTipo) + '</td>' +
                  '<td style="font-size:12px">' + esc(a.activoMarca || '') + ' ' + esc(a.activoModelo || '') + '</td>' +
                  '<td style="font-size:11px;font-family:monospace">' + esc(a.serieAsignada || '—') + '</td>' +
                  '<td style="font-size:11px;font-family:monospace">' + esc(a.activoCodigo || '—') + '</td>' +
                  '<td>' + _eqBadge(act ? act.estadoEquipo : '') + '</td>' +
                '</tr>';}).join('')}</tbody>
              </table>
            </div>
          </div>`;
        }

        return `
          <div>
            <label style="font-size:13px;font-weight:600;margin-bottom:8px;display:block">Equipos asignados (${grupo.length})</label>
            <div class="table-scroll">
              <table>
                <thead><tr>
                  <th>#</th><th>Tipo</th><th>Equipo</th><th>Serie</th><th>Código</th><th>Estado</th>
                </tr></thead>
                <tbody>${equiposHTML}</tbody>
              </table>
            </div>
          </div>`;
      })()}
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    <button class="btn btn-primary" onclick="closeModal();previewActaEntrega(${first.id})">📄 Acta de Entrega</button>
  `, 'modal-lg');
}

function deleteAsignacionGrupo(ticket, colabId, fecha) {
  const asignaciones = DB.get('asignaciones');
  const grupo = asignaciones.filter(a =>
    a.ticket === ticket && a.colaboradorId === colabId && a.fechaAsignacion === fecha
  );
  if (grupo.length === 0) return;
  if (!confirm('¿Eliminar esta asignación (' + grupo.length + ' equipo(s))?\nSe revertirán los cambios en Activos, Bitácora y Reemplazos asociados.')) return;

  const ids = grupo.map(a => a.id);

  // ── 1. Revertir estado de Activos ──
  const activos = DB.get('activos');
  const asigFinal = asignaciones.filter(a => !ids.includes(a.id));
  grupo.forEach(a => {
    const activo = activos.find(x => x.id === a.activoId);
    if (activo && a.estado === 'Vigente') {
      const otrasVigentes = asigFinal.filter(o => o.activoId === a.activoId && o.estado === 'Vigente').length;
      if (otrasVigentes === 0) {
        activo.estado = 'Disponible';
        activo.responsable = '';
      }
    }
  });
  DB.set('activos', activos);

  // ── 2. Marcar entradas de Bitácora (SALIDA) como CANCELADO/ANULADO ──
  const bitacora = DB.get('bitacoraMovimientos') || [];
  const seriesGrupo = grupo.map(a => (a.serieAsignada || '').toUpperCase()).filter(Boolean);
  const ticketUpper = ticket.toUpperCase();
  bitacora.forEach(b => {
    if ((b.movimiento || '').toUpperCase() !== 'SALIDA') return;
    if ((b.ticket || '').toUpperCase() !== ticketUpper) return;
    let coincide = false;
    if (seriesGrupo.length > 0 && (b.serie || '').toUpperCase() && seriesGrupo.includes((b.serie || '').toUpperCase())) {
      coincide = true;
    }
    if (!coincide && seriesGrupo.length === 0) {
      const correoColab = (grupo[0].correoColab || '').toLowerCase();
      if (correoColab && (b.correo || '').toLowerCase() === correoColab) coincide = true;
    }
    if (coincide) {
      b.movimiento = 'CANCELADO';
      b.estadoAsignacion = 'ANULADO';
      b.actaCorrelativo = '';
    }
  });
  DB.set('bitacoraMovimientos', bitacora);

  // ── 3. Revertir flags de reemplazo/renovación en asignación anterior (si aplica) ──
  grupo.forEach(a => {
    const _delTipo = (a.tipoAsignacion || '').toUpperCase();
    const _delMot = (a.motivo || '').toUpperCase();
    const _esReemORenov = _delTipo === 'REEMPLAZO' || _delTipo === 'RENOVACIÓN' || _delTipo === 'REPOSICIÓN DAÑO FÍSICO' || _delTipo === 'REPOSICIÓN ROBO' || _delMot === 'REEMPLAZO' || _delMot === 'RENOVACIÓN' || _delMot === 'REPOSICIÓN DAÑO FÍSICO' || _delMot === 'REPOSICIÓN ROBO';
    if (_esReemORenov) {
      // Buscar asignaciones anteriores marcadas con pendienteRetorno por este ticket
      asigFinal.forEach(prev => {
        if (prev.pendienteRetorno && (prev.ticketReemplazo || '').toUpperCase() === ticketUpper) {
          prev.pendienteRetorno = false;
          delete prev.fechaReemplazo;
          delete prev.motivoReemplazo;
          delete prev.ticketReemplazo;
        }
      });
    }
  });

  DB.set('asignaciones', asigFinal);
  addMovimiento('Eliminación Asignación', `${grupo.length} equipo(s) del ticket ${ticket}`);
  showToast('Asignación eliminada (cambios revertidos)');
  renderAsignacion(document.getElementById('contentArea'));
}

function devolverActivo(asigId) {
  const asignaciones = DB.get('asignaciones');
  const a = asignaciones.find(x => x.id === asigId);
  if (!a) return;

  const activos = DB.get('activos');
  const act = activos.find(x => x.id === a.activoId);

  openModal('Destino del Activo', `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--bg-secondary)">
        <strong style="font-family:monospace">${act ? esc(act.codigo) : '—'}</strong>
        <span style="font-size:12px;color:var(--text-muted);margin-left:8px">${act ? `${esc(act.tipo)} ${esc(act.marca)} ${esc(act.modelo)}` : ''}</span>
        ${a.serieAsignada ? `<span style="font-size:11px;color:var(--text-light);margin-left:4px">S/N: ${esc(a.serieAsignada)}</span>` : ''}
      </div>
      <div style="display:flex;gap:8px">
        <select class="form-control" id="devSingleDest" onchange="_onSingleDestinoChange()" style="flex:1;height:36px;font-size:13px">
          <option value="">Seleccionar destino...</option>
          <option value="DISPONIBLE">DISPONIBLE</option>
          <option value="MANTENIMIENTO">MANTENIMIENTO</option>
          <option value="BAJA">BAJA</option>
          <option value="NO RECUPERABLE">NO RECUPERABLE</option>
        </select>
        <select class="form-control" id="devSingleSub" style="flex:1;height:36px;font-size:13px;display:none">
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_ejecutarDevSingle(${asigId})">Confirmar</button>
  `);
}

function _onSingleDestinoChange() {
  const dest = document.getElementById('devSingleDest').value;
  const sub = document.getElementById('devSingleSub');
  const subOpciones = { 'DISPONIBLE': ['USADO'], 'MANTENIMIENTO': ['REPARACIÓN'], 'BAJA': ['OBSOLESCENCIA', 'DESTRUCCIÓN', 'PÉRDIDA'], 'NO RECUPERABLE': [] };
  const opts = subOpciones[dest] || [];
  if (opts.length === 0) { sub.style.display = 'none'; sub.innerHTML = ''; }
  else { sub.style.display = ''; sub.innerHTML = opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join(''); }
}

function _ejecutarDevSingle(asigId) {
  const destino = (document.getElementById('devSingleDest') || {}).value;
  if (!destino) { showToast('Seleccione un destino', 'error'); return; }
  const subSel = document.getElementById('devSingleSub');
  const subDestino = subSel && subSel.value ? subSel.value : '';

  const asig = DB.get('asignaciones');
  const a = asig.find(x => x.id === asigId);
  if (!a) return;

  a.estado = 'Devuelto';

  const activos = DB.get('activos');
  const activo = activos.find(x => x.id === a.activoId);
  if (activo) {
    // Solo cambiar estado del activo si no quedan más series vigentes
    const otrasVigentes = asig.filter(o => o.activoId === a.activoId && o.estado === 'Vigente').length;
    if (otrasVigentes === 0) {
      switch (destino) {
        case 'DISPONIBLE':
          activo.estado = 'Disponible'; activo.estadoEquipo = subDestino || 'USADO'; activo.responsable = ''; break;
        case 'MANTENIMIENTO':
          activo.estado = 'En Mantenimiento'; activo.estadoEquipo = subDestino || 'REPARACIÓN'; activo.responsable = ''; break;
        case 'BAJA':
          activo.estado = 'Dado de Baja'; activo.motivoBaja = subDestino || ''; activo.responsable = ''; break;
        case 'NO RECUPERABLE':
          break;
      }
    }
  }

  DB.set('asignaciones', asig);
  DB.set('activos', activos);
  addMovimiento('Devolución', `${a.activoCodigo} → ${destino}${subDestino ? ' (' + subDestino + ')' : ''} — devuelto por ${a.colaboradorNombre}`);

  // Auto-registrar en bitácora: INGRESO (equipo devuelto regresa a almacén)
  if (activo) {
    _autoBitacora({
      movimiento: 'INGRESO',
      almacen: (activo.ubicacion || 'Almacen TI'),
      tipoEquipo: activo.tipo || a.activoTipo || '',
      equipo: activo.equipo || activo.tipo || '',
      modelo: activo.modelo || a.activoModelo || '',
      serie: a.serieAsignada || '',
      inv: activo.codInventario || '',
      correo: a.correoColab || '',
      motivo: (['REEMPLAZO','RENOVACIÓN','RENOVACION','PRÉSTAMO','PRESTAMO','REPOSICIÓN DAÑO FÍSICO','REPOSICIÓN ROBO'].includes((a.tipoAsignacion || a.motivo || '').toUpperCase())) ? (a.tipoAsignacion || a.motivo) : ''
    });
  }

  closeModal();
  showToast('Activo procesado correctamente');
  renderCeses(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   COLABORADORES - CESES
   ═══════════════════════════════════════════════════════ */
let cesSearch = '';

function _estadoCese(c) {
  if (!c.fechaCese) return 'Cesado';
  return c.fechaCese > today() ? 'Próximo Cese' : 'Cesado';
}

function renderCeses(el) {
  const colabs = DB.get('colaboradores');
  const cesados = colabs.filter(c => c.estado === 'Cesado');
  const hoy = today();
  const efectivos = cesados.filter(c => !c.fechaCese || c.fechaCese <= hoy).length;
  const proximos = cesados.filter(c => c.fechaCese && c.fechaCese > hoy).length;
  const pendienteDev = cesados.filter(c => {
    const asig = DB.get('asignaciones').filter(a => a.colaboradorId === c.id && a.estado === 'Vigente');
    return asig.length > 0;
  }).length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Ceses de Colaboradores</h1>
        <div class="subtitle">Gestión de ceses y devolución de activos</div>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon red">⛔</div></div>
        <div class="stat-value">${cesados.length}</div>
        <div class="stat-label">Total registros</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon" style="background:#fef2f2;color:#dc2626">✓</div></div>
        <div class="stat-value">${efectivos}</div>
        <div class="stat-label">Cesados</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon" style="background:#fef9c3;color:#a16207">⏳</div></div>
        <div class="stat-value">${proximos}</div>
        <div class="stat-label">Próximo Cese</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon" style="background:#fff7ed;color:#c2410c">📦</div></div>
        <div class="stat-value">${pendienteDev}</div>
        <div class="stat-label">Pendiente devolución</div>
      </div>
    </div>

    <div class="table-toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="cesSearchInput" placeholder="Buscar por nombre, DNI, área..."
               value="${esc(cesSearch)}"
               oninput="_onCesSearch(this.value)">
      </div>
    </div>

    <div id="cesTableWrap"></div>
  `;
  _renderCesTable();
}

let _cesSearchTimer = null;
function _onCesSearch(val) {
  cesSearch = val;
  resetPage('ceses');
  clearTimeout(_cesSearchTimer);
  _cesSearchTimer = setTimeout(_renderCesTable, 120);
}

function _renderCesTable() {
  const wrap = document.getElementById('cesTableWrap');
  if (!wrap) return;
  const cesados = DB.get('colaboradores').filter(c => c.estado === 'Cesado');
  const asignaciones = DB.get('asignaciones');

  const filtered = cesados.filter(c => {
    if (cesSearch) {
      const s = cesSearch.toLowerCase();
      return (c.nombre || '').toLowerCase().includes(s) ||
             (c.dni || '').toLowerCase().includes(s) ||
             (c.area || '').toLowerCase().includes(s) ||
             (c.cargo || '').toLowerCase().includes(s) ||
             (c.email || '').toLowerCase().includes(s) ||
             (c.ubicacion || '').toLowerCase().includes(s);
    }
    return true;
  });

  wrap.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Área</th>
              <th>Ubicación</th>
              <th>Cargo</th>
              <th>Estado</th>
              <th>F. Cese</th>
              <th>Activos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? '<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">⛔</div><h3>Sin registros</h3><p>No hay colaboradores en proceso de cese</p></div></td></tr>'
              : pagSlice(filtered, 'ceses').map(c => {
                  const estado = _estadoCese(c);
                  const esProximo = estado === 'Próximo Cese';
                  const activosVigentes = asignaciones.filter(a => a.colaboradorId === c.id && a.estado === 'Vigente').length;
                  return `
                    <tr>
                      <td style="font-size:12px;color:var(--text-light)">${c.id}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px">
                          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${esProximo ? '#f59e0b,#d97706' : '#ef4444,#dc2626'});display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">
                            ${esc((c.nombre || '').split(' ').map(p => p[0]).slice(0, 2).join(''))}
                          </div>
                          <strong>${esc(c.nombre)}</strong>
                        </div>
                      </td>
                      <td style="font-family:monospace;font-size:12px">${esc(c.dni)}</td>
                      <td style="font-size:12px">${esc(c.area || '—')}</td>
                      <td style="font-size:12px">${esc(c.ubicacion || '—')}</td>
                      <td style="font-size:12px">${esc(c.cargo || '—')}</td>
                      <td>
                        ${esProximo
                          ? '<span class="badge badge-warning" style="font-size:10px">Próximo Cese</span>'
                          : '<span class="badge badge-danger" style="font-size:10px">Cesado</span>'
                        }
                      </td>
                      <td style="font-size:12px;font-weight:600;color:${esProximo ? '#a16207' : '#dc2626'}">${formatDate(c.fechaCese)}</td>
                      <td>
                        ${activosVigentes > 0
                          ? `<span class="badge badge-warning" style="font-size:10px;cursor:pointer" onclick="openDevolucionModal(${c.id})" title="Pendiente devolución">📦 ${activosVigentes} pendiente${activosVigentes > 1 ? 's' : ''}</span>`
                          : '<span style="font-size:11px;color:var(--text-muted)">Sin activos</span>'
                        }
                      </td>
                      <td>
                        <div class="action-btns">
                          <button class="btn-icon" title="Ver detalle" onclick="verColaborador(${c.id})">👁️</button>
                          ${activosVigentes > 0 ? `<button class="btn-icon" title="Gestionar devolución" onclick="openDevolucionModal(${c.id})" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa">📦</button>` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        ${pagFooter('ceses', filtered.length)}
      </div>
    </div>
  `;
}

function openDevolucionModal(colabId) {
  const colabs = DB.get('colaboradores');
  const c = colabs.find(x => x.id === colabId);
  if (!c) return;

  const asig = DB.get('asignaciones').filter(a => a.colaboradorId === colabId && a.estado === 'Vigente');
  const activos = DB.get('activos');

  openModal('Devolución de Activos — ' + esc(c.nombre), `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700">
          ${esc((c.nombre || '').split(' ').map(p => p[0]).slice(0, 2).join(''))}
        </div>
        <div>
          <strong style="font-size:15px">${esc(c.nombre)}</strong>
          <div style="font-size:12px;color:var(--text-muted)">${esc(c.cargo || '')} — ${esc(c.area || '')} | Cese: ${formatDate(c.fechaCese)}</div>
        </div>
      </div>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;font-size:13px;color:#9a3412">
        📦 Este colaborador tiene <strong>${asig.length} activo(s)</strong> pendientes de devolución. Seleccione los que desea confirmar como devueltos.
      </div>

      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
        <table style="width:100%;font-size:12px">
          <thead>
            <tr>
              <th style="padding:8px 6px;background:var(--bg-secondary);width:40px;text-align:center">
                <input type="checkbox" id="devSelectAll" onchange="document.querySelectorAll('.dev-check').forEach(cb=>cb.checked=this.checked)">
              </th>
              <th style="padding:8px 6px;background:var(--bg-secondary)">Código</th>
              <th style="padding:8px 6px;background:var(--bg-secondary)">Tipo</th>
              <th style="padding:8px 6px;background:var(--bg-secondary)">Marca</th>
              <th style="padding:8px 6px;background:var(--bg-secondary)">Modelo</th>
              <th style="padding:8px 6px;background:var(--bg-secondary)">Serie</th>
              <th style="padding:8px 6px;background:var(--bg-secondary)">F. Asignación</th>
            </tr>
          </thead>
          <tbody>
            ${asig.map(a => {
              const act = activos.find(x => x.id === a.activoId);
              return `
                <tr>
                  <td style="padding:6px;text-align:center">
                    <input type="checkbox" class="dev-check" value="${a.id}" checked>
                  </td>
                  <td style="padding:6px;font-family:monospace">${act ? esc(act.codigo) : '—'}</td>
                  <td style="padding:6px">${act ? esc(act.tipo) : '—'}</td>
                  <td style="padding:6px">${act ? esc(act.marca) : '—'}</td>
                  <td style="padding:6px">${act ? esc(act.modelo) : '—'}</td>
                  <td style="padding:6px;font-family:monospace;font-size:11px">${esc(a.serieAsignada || '—')}</td>
                  <td style="padding:6px">${formatDate(a.fechaAsignacion)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="confirmarDevolucion(${colabId})">Confirmar Devolución</button>
  `);
}

function confirmarDevolucion(colabId) {
  const checks = document.querySelectorAll('.dev-check:checked');
  if (checks.length === 0) {
    showToast('Seleccione al menos un activo para devolver', 'error');
    return;
  }

  const asigIds = [...checks].map(cb => Number(cb.value));
  const asignaciones = DB.get('asignaciones');
  const activos = DB.get('activos');
  const c = DB.get('colaboradores').find(x => x.id === colabId);

  // Construir lista de activos seleccionados
  const items = asigIds.map(aid => {
    const a = asignaciones.find(x => x.id === aid);
    if (!a) return null;
    const act = activos.find(x => x.id === a.activoId);
    return { asigId: aid, activoId: a.activoId, codigo: act ? act.codigo : '—', tipo: act ? act.tipo : '', marca: act ? act.marca : '', modelo: act ? act.modelo : '', serie: a.serieAsignada || '', motivo: a.tipoAsignacion || a.motivo || '' };
  }).filter(Boolean);

  if (items.length === 0) return;

  // Abrir modal de destino
  openModal('Destino de Activos Devueltos', `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">
          ${esc((c?.nombre || '').split(' ').map(p => p[0]).slice(0, 2).join(''))}
        </div>
        <div>
          <strong>${esc(c?.nombre || '')}</strong>
          <div style="font-size:11px;color:var(--text-muted)">${items.length} activo(s) a procesar</div>
        </div>
      </div>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;font-size:12px;color:#1e40af">
        Seleccione el destino de cada activo devuelto.
      </div>

      <div style="display:flex;flex-direction:column;gap:10px" id="devDestinoList">
        ${items.map((item, i) => `
          <div style="border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--bg-secondary)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div>
                <strong style="font-size:13px;font-family:monospace">${esc(item.codigo)}</strong>
                <span style="font-size:12px;color:var(--text-muted);margin-left:8px">${esc(item.tipo)} ${esc(item.marca)} ${esc(item.modelo)}</span>
                ${item.serie ? `<span style="font-size:11px;color:var(--text-light);margin-left:4px">S/N: ${esc(item.serie)}</span>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <select class="form-control dev-destino" id="devDest_${i}" data-idx="${i}" onchange="_onDestinoChange(${i})" style="flex:1;min-width:160px;height:34px;font-size:12px">
                <option value="">Seleccionar destino...</option>
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                <option value="BAJA">BAJA</option>
                <option value="NO RECUPERABLE">NO RECUPERABLE</option>
              </select>
              <select class="form-control dev-sub" id="devSub_${i}" style="flex:1;min-width:140px;height:34px;font-size:12px;display:none">
              </select>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_ejecutarDevolucion(${colabId})">Confirmar</button>
  `, 'modal-lg');

  // Guardar items en variable temporal
  window._devItems = items;
}

function _onDestinoChange(idx) {
  const dest = document.getElementById('devDest_' + idx).value;
  const subSelect = document.getElementById('devSub_' + idx);
  if (!subSelect) return;

  const subOpciones = {
    'DISPONIBLE':      ['USADO'],
    'MANTENIMIENTO':   ['REPARACIÓN'],
    'BAJA':            ['OBSOLESCENCIA', 'DESTRUCCIÓN', 'PÉRDIDA'],
    'NO RECUPERABLE':  []
  };

  const opts = subOpciones[dest] || [];
  if (opts.length === 0) {
    subSelect.style.display = 'none';
    subSelect.innerHTML = '';
  } else {
    subSelect.style.display = '';
    subSelect.innerHTML = opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
  }
}

function _ejecutarDevolucion(colabId) {
  const items = window._devItems || [];
  if (items.length === 0) return;

  // Validar que todos tengan destino
  for (let i = 0; i < items.length; i++) {
    const dest = document.getElementById('devDest_' + i);
    if (!dest || !dest.value) {
      showToast('Seleccione el destino de todos los activos', 'error');
      return;
    }
  }

  const asig = DB.get('asignaciones');
  const activos = DB.get('activos');
  const resumen = [];

  items.forEach((item, i) => {
    const destino = document.getElementById('devDest_' + i).value;
    const subSel = document.getElementById('devSub_' + i);
    const subDestino = subSel && subSel.value ? subSel.value : '';

    // Marcar asignación como devuelta
    const a = asig.find(x => x.id === item.asigId);
    if (a) a.estado = 'Devuelto';

    // Actualizar activo según destino (solo si no quedan más series vigentes)
    const activo = activos.find(x => x.id === item.activoId);
    if (!activo) return;

    const otrasVigentes = asig.filter(o => o.activoId === item.activoId && o.estado === 'Vigente').length;

    switch (destino) {
      case 'DISPONIBLE':
        if (otrasVigentes === 0) {
          activo.estado = 'Disponible';
          activo.estadoEquipo = subDestino || 'USADO';
          activo.responsable = '';
        }
        resumen.push(`${item.codigo} → DISPONIBLE (${subDestino || 'USADO'})`);
        break;
      case 'MANTENIMIENTO':
        if (otrasVigentes === 0) {
          activo.estado = 'En Mantenimiento';
          activo.estadoEquipo = subDestino || 'REPARACIÓN';
          activo.responsable = '';
        }
        resumen.push(`${item.codigo} → MANTENIMIENTO (${subDestino || 'REPARACIÓN'})`);
        break;
      case 'BAJA':
        if (otrasVigentes === 0) {
          activo.estado = 'Dado de Baja';
          activo.motivoBaja = subDestino || '';
          activo.responsable = '';
        }
        resumen.push(`${item.codigo} → BAJA (${subDestino})`);
        break;
      case 'NO RECUPERABLE':
        resumen.push(`${item.codigo} → NO RECUPERABLE`);
        break;
    }
  });

  DB.set('asignaciones', asig);
  DB.set('activos', activos);

  const c = DB.get('colaboradores').find(x => x.id === colabId);
  addMovimiento('Devolución Cese', `${items.length} activo(s) procesados de ${c ? c.nombre : 'colaborador'}: ${resumen.join('; ')}`);

  // Auto-registrar en bitácora: INGRESO por cada equipo devuelto
  items.forEach(item => {
    const _devActivo = activos.find(x => x.id === item.activoId);
    if (_devActivo) {
      _autoBitacora({
        movimiento: 'INGRESO',
        almacen: (_devActivo.ubicacion || 'Almacen TI'),
        tipoEquipo: _devActivo.tipo || '',
        equipo: _devActivo.equipo || _devActivo.tipo || '',
        modelo: _devActivo.modelo || '',
        serie: item.serie || '',
        inv: _devActivo.codInventario || '',
        correo: c ? (c.email || '') : '',
        motivo: (['REEMPLAZO','RENOVACIÓN','RENOVACION','PRÉSTAMO','PRESTAMO','REPOSICIÓN DAÑO FÍSICO','REPOSICIÓN ROBO'].includes((item.motivo || '').toUpperCase())) ? item.motivo : ''
      });
    }
  });

  closeModal();
  showToast(`${items.length} activo(s) procesados correctamente`);
  renderCeses(document.getElementById('contentArea'));
  window._devItems = null;
}

function openColabModal(id) {
  const colabs = DB.get('colaboradores');
  const c = id ? colabs.find(x => x.id === id) : null;
  const areas = DB.getConfig('areas', []);
  const sedes = DB.getConfig('sedesAdmin', []);
  const tiposPuesto = DB.getConfig('tipoPuesto', []);
  const perfiles = ['Empleado', 'Practicante', 'Externo', 'Intermediario'];

  openModal(c ? 'Editar Colaborador' : 'Nuevo Colaborador', `
    <div class="form-grid">
      <div class="form-group">
        <label>Nombre <span class="required">*</span></label>
        <input class="form-control" id="fCNombre" value="${esc(c?.nombre || '')}">
      </div>
      <div class="form-group">
        <label>DNI <span class="required">*</span></label>
        <input class="form-control" id="fCDni" value="${esc(c?.dni || '')}">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input class="form-control" id="fCEmail" value="${esc(c?.email || '')}">
      </div>
      <div class="form-group">
        <label>Teléfono</label>
        <input class="form-control" id="fCTelefono" placeholder="987654321" value="${esc(c?.telefono || '')}">
      </div>
      <div class="form-group">
        <label>Perfil <span class="required">*</span></label>
        <select class="form-control" id="fCPerfil">
          <option value="">Seleccionar...</option>
          ${perfiles.map(p => `<option value="${p}" ${c?.perfil === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Área</label>
        <select class="form-control" id="fCArea"><option value="">Seleccionar...</option>${optionsHTML(areas, c?.area)}</select>
      </div>
      <div class="form-group">
        <label>Ubicación</label>
        <select class="form-control" id="fCUbicacion"><option value="">Seleccionar...</option>${optionsHTML(sedes, c?.ubicacion)}</select>
      </div>
      <div class="form-group">
        <label>Tipo de Puesto</label>
        <select class="form-control" id="fCTipoPuesto"><option value="">Seleccionar...</option>${optionsHTML(tiposPuesto, c?.tipoPuesto)}</select>
      </div>
      <div class="form-group">
        <label>Cargo</label>
        <input class="form-control" id="fCCargo" value="${esc(c?.cargo || '')}">
      </div>
      <div class="form-group">
        <label>Fecha Ingreso</label>
        <input type="date" class="form-control" id="fCFecha" value="${c?.fechaIngreso || today()}">
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveColab(${id || 'null'})">${c ? 'Guardar' : 'Registrar'}</button>
  `);
}

function saveColab(id) {
  const nombre = document.getElementById('fCNombre').value.trim();
  const dni = document.getElementById('fCDni').value.trim();
  const email = document.getElementById('fCEmail').value.trim();
  const telefono = document.getElementById('fCTelefono').value.trim();
  const perfil = document.getElementById('fCPerfil').value;
  const area = document.getElementById('fCArea').value;
  const ubicacion = document.getElementById('fCUbicacion').value;
  const tipoPuesto = document.getElementById('fCTipoPuesto').value;
  const cargo = document.getElementById('fCCargo').value.trim();
  const fecha = document.getElementById('fCFecha').value;

  if (!nombre || !dni) {
    showToast('Complete nombre y DNI', 'error');
    return;
  }
  if (!perfil) {
    showToast('Seleccione un perfil', 'error');
    return;
  }

  const colabs = DB.get('colaboradores');

  if (id) {
    const idx = colabs.findIndex(c => c.id === id);
    if (idx >= 0) colabs[idx] = { ...colabs[idx], ...upperFields({ nombre, dni, email, telefono, perfil, area, ubicacion, tipoPuesto, cargo, fechaIngreso: fecha }) };
  } else {
    colabs.push(upperFields({
      id: nextId(colabs), nombre, dni, email, telefono, perfil, area, ubicacion, tipoPuesto, cargo,
      estado: 'Activo', fechaIngreso: fecha || today()
    }));
    addMovimiento('Ingreso Colaborador', `Nuevo colaborador: ${nombre.toUpperCase()}`);
  }

  DB.set('colaboradores', colabs);
  closeModal();
  showToast(id ? 'Colaborador actualizado' : 'Colaborador registrado');
  renderPadron(document.getElementById('contentArea'));
}

function openCeseModal(id) {
  const colabs = DB.get('colaboradores');
  const c = colabs.find(x => x.id === id);
  if (!c) return;

  const asigVigentes = DB.get('asignaciones').filter(a => a.colaboradorId === id && a.estado === 'Vigente').length;

  openModal('Cese de Colaborador', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700">
          ${esc((c.nombre || '').split(' ').map(p => p[0]).slice(0, 2).join(''))}
        </div>
        <div>
          <strong style="font-size:15px">${esc(c.nombre)}</strong>
          <div style="font-size:12px;color:var(--text-muted)">${esc(c.cargo || '')} — ${esc(c.area || '')}</div>
        </div>
      </div>

      ${asigVigentes > 0 ? `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;font-size:13px;color:#1e40af">
          ℹ️ Este colaborador tiene <strong>${asigVigentes} activo(s) asignado(s)</strong>. La devolución se gestionará desde el módulo de Ceses.
        </div>
      ` : ''}

      <div class="form-group">
        <label>Fecha de Cese <span class="required">*</span></label>
        <input type="date" class="form-control" id="fFechaCese" value="${today()}">
      </div>

      <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:13px;color:#92400e">
        ⚠️ Si la fecha es futura, el colaborador quedará como <strong>Próximo Cese</strong>. Si es hoy o pasada, quedará como <strong>Cesado</strong>.
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="confirmarCese(${id})">Confirmar Cese</button>
  `);
}

function confirmarCese(id) {
  const fechaCese = document.getElementById('fFechaCese').value;
  if (!fechaCese) {
    showToast('Ingrese la fecha de cese', 'error');
    return;
  }

  const colabs = DB.get('colaboradores');
  const c = colabs.find(x => x.id === id);
  if (!c) return;

  c.estado = 'Cesado';
  c.fechaCese = fechaCese;
  DB.set('colaboradores', colabs);

  const esFuturo = fechaCese > today();
  addMovimiento('Cese', `Colaborador ${c.nombre} — ${esFuturo ? 'próximo cese' : 'cesado'} el ${formatDate(fechaCese)}.`);
  closeModal();
  showToast(esFuturo ? 'Próximo cese registrado' : 'Colaborador cesado correctamente');
  renderPadron(document.getElementById('contentArea'));
}

function deleteColab(id) {
  if (!confirm('¿Eliminar este colaborador?')) return;
  DB.set('colaboradores', DB.get('colaboradores').filter(x => x.id !== id));
  showToast('Colaborador eliminado');
  renderPadron(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   TIENDAS - GESTIÓN DE TIENDAS
   ═══════════════════════════════════════════════════════ */
let tiendaSearch = '';
let tiendaFilterRegion = 'Todos';
let tiendaFilterEstado = 'Todos';
let tiendaFilterTipo = 'Todos';

function renderTiendas(el) {
  const tiendas = DB.get('tiendas');
  const regiones = ['Todos', ...DB.getConfig('regiones', [])];
  const tiposLocal = ['Todos', ...DB.getConfig('tiposLocal', [])];
  const estadosTienda = ['Todos', 'Activa', 'Inactiva'];

  const filtered = tiendas.filter(t => {
    if (tiendaFilterRegion !== 'Todos' && t.region !== tiendaFilterRegion) return false;
    if (tiendaFilterEstado !== 'Todos' && t.estado !== tiendaFilterEstado) return false;
    if (tiendaFilterTipo !== 'Todos' && t.tipoLocal !== tiendaFilterTipo) return false;
    if (tiendaSearch) {
      const s = tiendaSearch.toLowerCase();
      return (t.codigo || '').toLowerCase().includes(s) ||
             (t.nombre || '').toLowerCase().includes(s) ||
             (t.direccion || '').toLowerCase().includes(s) ||
             (t.responsable || '').toLowerCase().includes(s) ||
             (t.departamento || '').toLowerCase().includes(s) ||
             (t.distrito || '').toLowerCase().includes(s);
    }
    return true;
  });

  const totalActivas = tiendas.filter(t => t.estado === 'Activa').length;
  const totalInactivas = tiendas.filter(t => t.estado === 'Inactiva').length;
  const byRegion = {};
  tiendas.forEach(t => { byRegion[t.region] = (byRegion[t.region] || 0) + 1; });
  const byTipo = {};
  tiendas.forEach(t => { byTipo[t.tipoLocal] = (byTipo[t.tipoLocal] || 0) + 1; });

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Gestión de Tiendas</h1>
        <div class="subtitle">Administración de locales, tiendas y ubicaciones de activos</div>
      </div>
      <button class="btn btn-primary" onclick="openTiendaModal()">+ Nueva Tienda</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon blue">🏪</div></div>
        <div class="stat-value">${tiendas.length}</div>
        <div class="stat-label">Total de tiendas</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">✅</div></div>
        <div class="stat-value">${totalActivas}</div>
        <div class="stat-label">Tiendas activas</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon red">⛔</div></div>
        <div class="stat-value">${totalInactivas}</div>
        <div class="stat-label">Tiendas inactivas</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon purple">📍</div></div>
        <div class="stat-value">${Object.keys(byRegion).length}</div>
        <div class="stat-label">Regiones cubiertas</div>
      </div>
    </div>

    <div class="table-toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Buscar por código, nombre, dirección, responsable, distrito..."
               value="${esc(tiendaSearch)}"
               oninput="tiendaSearch=this.value;resetPage('tiendas');renderTiendas(document.getElementById('contentArea'))">
      </div>
      <div class="filter-chips">
        ${estadosTienda.map(e => `
          <span class="filter-chip ${tiendaFilterEstado === e ? 'active' : ''}"
                onclick="tiendaFilterEstado='${e}';resetPage('tiendas');renderTiendas(document.getElementById('contentArea'))">
            ${e}
          </span>
        `).join('')}
      </div>
    </div>

    <div class="table-toolbar" style="margin-top:-8px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--text-muted);font-weight:500">Región:</span>
        ${regiones.map(r => `
          <span class="filter-chip ${tiendaFilterRegion === r ? 'active' : ''}"
                onclick="tiendaFilterRegion='${esc(r)}';resetPage('tiendas');renderTiendas(document.getElementById('contentArea'))">
            ${esc(r)}
          </span>
        `).join('')}
      </div>
    </div>

    <div class="table-toolbar" style="margin-top:-8px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--text-muted);font-weight:500">Tipo:</span>
        ${tiposLocal.map(t => `
          <span class="filter-chip ${tiendaFilterTipo === t ? 'active' : ''}"
                onclick="tiendaFilterTipo='${esc(t)}';resetPage('tiendas');renderTiendas(document.getElementById('contentArea'))">
            ${esc(t)}
          </span>
        `).join('')}
      </div>
    </div>

    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Región</th>
              <th>Departamento</th>
              <th>Distrito</th>
              <th>Tipo Local</th>
              <th>Responsable</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>F. Apertura</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? '<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">🏪</div><h3>Sin resultados</h3><p>No se encontraron tiendas con los filtros aplicados</p></div></td></tr>'
              : pagSlice(filtered, 'tiendas').map(t => `
                  <tr>
                    <td><strong>${esc(t.codigo)}</strong></td>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#ef4444);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;flex-shrink:0">🏪</div>
                        <strong>${esc(t.nombre)}</strong>
                      </div>
                    </td>
                    <td><span class="badge badge-info" style="font-size:10px">${esc(t.region)}</span></td>
                    <td>${esc(t.departamento)}</td>
                    <td>${esc(t.distrito || '—')}</td>
                    <td><span class="badge badge-purple" style="font-size:10px">${esc(t.tipoLocal)}</span></td>
                    <td>${esc(t.responsable)}</td>
                    <td style="font-size:12px">${esc(t.telefono || '—')}</td>
                    <td>
                      <span class="badge ${t.estado === 'Activa' ? 'badge-success' : 'badge-danger'}">
                        <span class="badge-dot"></span>${esc(t.estado)}
                      </span>
                    </td>
                    <td>${formatDate(t.fechaApertura)}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-icon" title="Ver detalle" onclick="openTiendaDetalle(${t.id})">👁️</button>
                        <button class="btn-icon" title="Editar" onclick="openTiendaModal(${t.id})">✏️</button>
                        <button class="btn-icon" title="Eliminar" onclick="deleteTienda(${t.id})">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        ${pagFooter('tiendas', filtered.length)}
      </div>
    </div>
  `;
}

function openTiendaModal(id) {
  const tiendas    = DB.get('tiendas');
  const t          = id ? tiendas.find(x => x.id === id) : null;
  const regiones   = DB.getConfig('regiones', []);
  const deptos     = DB.getConfig('departamentos', []);
  const tiposLocal = DB.getConfig('tiposLocal', []);

  openModal(t ? 'Editar Tienda' : 'Registrar Nueva Tienda', `
    <div class="form-grid-3">

      <div class="form-group">
        <label>Nombre de la Tienda <span class="required">*</span></label>
        <div class="input-icon-wrap">
          <span class="iw-icon">🏪</span>
          <input class="form-control" id="fTNombre" placeholder="Ej: Tienda San Borja" value="${esc(t?.nombre || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Tipo de Local <span class="required">*</span></label>
        <select class="form-control" id="fTTipoLocal">
          <option value="">Seleccionar...</option>
          ${optionsHTML(tiposLocal, t?.tipoLocal)}
        </select>
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select class="form-control" id="fTEstado">
          <option value="Activa" ${t?.estado === 'Activa' || !t ? 'selected' : ''}>Activa</option>
          <option value="Inactiva" ${t?.estado === 'Inactiva' ? 'selected' : ''}>Inactiva</option>
        </select>
      </div>

      <div class="form-group">
        <label>Región <span class="required">*</span></label>
        <select class="form-control" id="fTRegion">
          <option value="">Seleccionar...</option>
          ${optionsHTML(regiones, t?.region)}
        </select>
      </div>
      <div class="form-group">
        <label>Departamento <span class="required">*</span></label>
        <select class="form-control" id="fTDepto">
          <option value="">Seleccionar...</option>
          ${optionsHTML(deptos, t?.departamento)}
        </select>
      </div>
      <div class="form-group">
        <label>Provincia</label>
        <div class="input-icon-wrap">
          <span class="iw-icon">📍</span>
          <input class="form-control" id="fTProvincia" placeholder="Provincia" value="${esc(t?.provincia || '')}">
        </div>
      </div>

      <div class="form-group">
        <label>Distrito</label>
        <div class="input-icon-wrap">
          <span class="iw-icon">📍</span>
          <input class="form-control" id="fTDistrito" placeholder="Distrito" value="${esc(t?.distrito || '')}">
        </div>
      </div>
      <div class="form-group span2">
        <label>Dirección Completa <span class="required">*</span></label>
        <div class="input-icon-wrap">
          <span class="iw-icon">🗺️</span>
          <input class="form-control" id="fTDireccion" placeholder="Av. / Jr. / Calle, número, referencia" value="${esc(t?.direccion || '')}">
        </div>
      </div>

      <div class="form-group">
        <label>Responsable de Tienda <span class="required">*</span></label>
        <div class="input-icon-wrap">
          <span class="iw-icon">👤</span>
          <input class="form-control" id="fTResponsable" placeholder="Nombre del responsable" value="${esc(t?.responsable || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Teléfono del Responsable</label>
        <div class="input-icon-wrap">
          <span class="iw-icon">📱</span>
          <input class="form-control" id="fTTelResp" placeholder="987654321" value="${esc(t?.telefonoResponsable || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Email del Responsable</label>
        <div class="input-icon-wrap">
          <span class="iw-icon">✉️</span>
          <input class="form-control" id="fTEmailResp" placeholder="correo@empresa.com" value="${esc(t?.emailResponsable || '')}">
        </div>
      </div>

      <div class="form-group">
        <label>Teléfono de la Tienda</label>
        <div class="input-icon-wrap">
          <span class="iw-icon">📞</span>
          <input class="form-control" id="fTTelefono" placeholder="01-2345678" value="${esc(t?.telefono || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Fecha de Apertura</label>
        <input type="date" class="form-control" id="fTFechaApertura" value="${t?.fechaApertura || today()}">
      </div>
      <div class="form-group">
        <label>&nbsp;</label>
      </div>

      <div class="form-group full">
        <label>Observaciones</label>
        <div class="input-icon-wrap">
          <span class="iw-icon" style="align-self:flex-start;margin-top:11px">≡</span>
          <textarea class="form-control" id="fTObs" rows="2" placeholder="Notas adicionales sobre la tienda">${esc(t?.observaciones || '')}</textarea>
        </div>
      </div>

    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveTienda(${id || 'null'})">${t ? 'Guardar Cambios' : 'Registrar Tienda'}</button>
  `, 'modal-lg');
}

function saveTienda(id) {
  const nombre    = document.getElementById('fTNombre').value.trim();
  const tipoLocal = document.getElementById('fTTipoLocal').value;
  const region    = document.getElementById('fTRegion').value;
  const depto     = document.getElementById('fTDepto').value;
  const direccion = document.getElementById('fTDireccion').value.trim();
  const responsable = document.getElementById('fTResponsable').value.trim();

  if (!nombre || !tipoLocal || !region || !depto || !direccion || !responsable) {
    showToast('Complete los campos obligatorios: Nombre, Tipo Local, Región, Departamento, Dirección y Responsable', 'error');
    return;
  }

  const campos = upperFields({
    nombre,
    tipoLocal,
    estado:              document.getElementById('fTEstado').value,
    region,
    departamento:        depto,
    provincia:           document.getElementById('fTProvincia').value.trim(),
    distrito:            document.getElementById('fTDistrito').value.trim(),
    direccion,
    responsable,
    telefonoResponsable: document.getElementById('fTTelResp').value.trim(),
    emailResponsable:    document.getElementById('fTEmailResp').value.trim(),
    telefono:            document.getElementById('fTTelefono').value.trim(),
    fechaApertura:       document.getElementById('fTFechaApertura').value || today(),
    observaciones:       document.getElementById('fTObs').value.trim()
  });

  const tiendas = DB.get('tiendas');

  if (id) {
    const idx = tiendas.findIndex(t => t.id === id);
    if (idx >= 0) {
      tiendas[idx] = { ...tiendas[idx], ...campos };
      addMovimiento('Edición Tienda', `Tienda ${tiendas[idx].codigo} (${nombre}) actualizada`);
    }
  } else {
    const newId = nextId(tiendas);
    const codigo = 'TDA-' + String(newId).padStart(5, '0');
    tiendas.push({ id: newId, codigo, ...campos });
    addMovimiento('Nueva Tienda', `Tienda ${codigo} (${nombre}) registrada`);
  }

  DB.set('tiendas', tiendas);
  closeModal();
  showToast(id ? 'Tienda actualizada correctamente' : 'Tienda registrada correctamente');
  renderTiendas(document.getElementById('contentArea'));
}

function deleteTienda(id) {
  if (!confirm('¿Está seguro de eliminar esta tienda?')) return;
  const tiendas = DB.get('tiendas');
  const t = tiendas.find(x => x.id === id);
  DB.set('tiendas', tiendas.filter(x => x.id !== id));
  if (t) addMovimiento('Eliminación Tienda', `Tienda ${t.codigo} (${t.nombre}) eliminada`);
  showToast('Tienda eliminada');
  renderTiendas(document.getElementById('contentArea'));
}

function openTiendaDetalle(id) {
  const tiendas = DB.get('tiendas');
  const t = tiendas.find(x => x.id === id);
  if (!t) return;

  openModal(`Detalle — ${esc(t.codigo)} · ${esc(t.nombre)}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Código</div>
        <div style="font-size:14px;font-weight:600">${esc(t.codigo)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Nombre</div>
        <div style="font-size:14px;font-weight:600">${esc(t.nombre)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Tipo de Local</div>
        <div><span class="badge badge-purple">${esc(t.tipoLocal)}</span></div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Estado</div>
        <div><span class="badge ${t.estado === 'Activa' ? 'badge-success' : 'badge-danger'}"><span class="badge-dot"></span>${esc(t.estado)}</span></div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Región</div>
        <div style="font-size:14px">${esc(t.region)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Departamento</div>
        <div style="font-size:14px">${esc(t.departamento)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Provincia</div>
        <div style="font-size:14px">${esc(t.provincia || '—')}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Distrito</div>
        <div style="font-size:14px">${esc(t.distrito || '—')}</div>
      </div>
      <div style="grid-column:1/-1">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Dirección</div>
        <div style="font-size:14px">${esc(t.direccion)}</div>
      </div>
      <div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
        <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px">👤 Responsable de la Tienda</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Nombre</div>
        <div style="font-size:14px;font-weight:500">${esc(t.responsable)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Teléfono</div>
        <div style="font-size:14px">${esc(t.telefonoResponsable || '—')}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Email</div>
        <div style="font-size:14px">${esc(t.emailResponsable || '—')}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Teléfono Tienda</div>
        <div style="font-size:14px">${esc(t.telefono || '—')}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Fecha de Apertura</div>
        <div style="font-size:14px">${formatDate(t.fechaApertura)}</div>
      </div>
      ${t.observaciones ? `
      <div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Observaciones</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.5">${esc(t.observaciones)}</div>
      </div>` : ''}
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    <button class="btn btn-primary" onclick="closeModal();openTiendaModal(${t.id})">Editar</button>
  `);
}

/* ═══════════════════════════════════════════════════════
   CMDB - INVENTARIO
   ═══════════════════════════════════════════════════════ */
let invSearch = '';
let _invFilterCMDB = 'Todos';
let _invSearchTimer = null;
// Filtros dinámicos del inventario CMDB
const _INV_FILTER_OPTIONS = [
  { key: 'estadoCMDB',    label: 'Estado CMDB' },
  { key: 'sede',           label: 'Sede / Almacén' },
  { key: 'tipo',           label: 'Tipo Equipo' },
  { key: 'marca',          label: 'Marca' },
  { key: 'estadoEquipo',   label: 'Estado Equipo' },
  { key: 'areaTrabajo',    label: 'Área Trabajo' },
  { key: 'usoEquipo',      label: 'Uso Equipo' },
];
let _invActiveFilters = { estadoCMDB: 'Todos' }; // estadoCMDB activo por defecto
let _invFilterMenuOpen = false;

function _buildInventarioRows() {
  const activos = DB.get('activos');
  const asignaciones = DB.get('asignaciones');
  const colaboradores = DB.get('colaboradores');
  const rows = [];

  activos.forEach(a => {
    const series = a.series || [];
    if (series.length === 0) {
      // Activo sin series — una fila
      const asig = asignaciones.find(x => x.activoId === a.id && x.estado === 'Vigente' && (!x.serieAsignada || x.serieAsignada === ''));
      const colab = asig ? colaboradores.find(c => c.id === asig.colaboradorId) : null;
      rows.push({
        activoId: a.id,
        sede: a.ubicacion || '',
        tipo: a.tipo || '',
        equipo: a.equipo || a.tipo || '',
        marca: a.marca || '',
        modelo: a.modelo || '',
        serie: '',
        codInventario: '',
        fechaAsignacion: asig ? asig.fechaAsignacion || '' : '',
        motivo: asig ? asig.motivo || '' : '',
        actaEntrega: asig ? (asig.actaEntrega || 'PENDIENTE') : '',
        estadoCMDB: asig ? 'Asignado' : (a.estado || 'Disponible'),
        estadoEquipo: a.estadoEquipo || '',
        usoEquipo: asig ? (asig.pendienteRetorno ? 'PENDIENTE RETORNO' : 'EN USO') : '',
        areaTrabajo: colab ? colab.area || '' : '',
        correo: colab ? colab.email || '' : '',
        colaborador: colab ? colab.nombre + (colab.cargo ? ' / ' + colab.cargo : '') : '',
        jefe: asig ? asig.jefe || '' : '',
        ticket: asig ? asig.ticket || '' : ''
      });
    } else {
      series.forEach(s => {
        // Buscar asignación vigente para ESTA serie específica (case-insensitive)
        const serieUp = (s.serie || '').toUpperCase().trim();
        const asig = asignaciones.find(x => x.activoId === a.id && x.estado === 'Vigente' && (x.serieAsignada || '').toUpperCase().trim() === serieUp);
        const colab = asig ? colaboradores.find(c => c.id === asig.colaboradorId) : null;
        rows.push({
          activoId: a.id,
          sede: a.ubicacion || '',
          tipo: a.tipo || '',
          equipo: a.equipo || a.tipo || '',
          marca: a.marca || '',
          modelo: a.modelo || '',
          serie: s.serie || '',
          codInventario: s.codInventario || '',
          fechaAsignacion: asig ? asig.fechaAsignacion || '' : '',
          motivo: asig ? asig.motivo || '' : '',
          actaEntrega: asig ? (asig.actaEntrega || 'PENDIENTE') : '',
          estadoCMDB: asig ? 'Asignado' : (a.estado || 'Disponible'),
          estadoEquipo: a.estadoEquipo || '',
          usoEquipo: asig ? (asig.pendienteRetorno ? 'PENDIENTE RETORNO' : 'EN USO') : '',
          areaTrabajo: colab ? colab.area || '' : '',
          correo: colab ? colab.email || '' : '',
          colaborador: colab ? colab.nombre + (colab.cargo ? ' / ' + colab.cargo : '') : '',
          jefe: asig ? asig.jefe || '' : '',
          ticket: asig ? asig.ticket || '' : ''
        });
      });
    }
  });
  return rows;
}

function verDetalleSerie(activoId, serie) {
  const activos = DB.get('activos');
  const activo = activos.find(a => a.id === activoId);
  if (!activo) return;

  const serieObj = (activo.series || []).find(s => (s.serie || '').toUpperCase().trim() === (serie || '').toUpperCase().trim()) || {};
  const asignaciones = DB.get('asignaciones');
  const asig = asignaciones.find(x => x.activoId === activoId && x.estado === 'Vigente' && (x.serieAsignada || '').toUpperCase().trim() === (serie || '').toUpperCase().trim());
  const colab = asig ? DB.get('colaboradores').find(c => c.id === asig.colaboradorId) : null;
  const esAsignado = !!asig;
  const esLaptopDesktop = _esTipoConSpecs(activo.tipo);
  const tipoUp = (activo.tipo || '').toUpperCase();
  const tipoIcon = tipoUp.includes('LAPTOP') ? '💻' : tipoUp.includes('DESKTOP') ? '🖥️' : tipoUp.includes('MONITOR') ? '🖥️' : tipoUp.includes('IMPRESORA') ? '🖨️' : tipoUp.includes('SERVIDOR') ? '🗄️' : tipoUp.includes('SWITCH') ? '🔌' : '📦';

  // Historial de asignaciones de esta serie
  const historial = asignaciones.filter(x => x.activoId === activoId && (x.serieAsignada || '').toUpperCase().trim() === (serie || '').toUpperCase().trim());

  // ── Tabs config ──
  const tabs = [
    { id: 'equipo', icon: tipoIcon, label: 'Equipo' },
    { id: 'specs', icon: '⚙️', label: 'Especificaciones' },
    esAsignado ? { id: 'usuario', icon: '👤', label: 'Colaborador' } : { id: 'almacen', icon: '🏢', label: 'Almacén' },
    { id: 'historial', icon: '📜', label: 'Historial' }
  ];

  // Helper: fila de dato en grid 2 cols
  const _f = (label, val, opts) => {
    if (!val) return '';
    const o = opts || {};
    return `<div style="display:flex;flex-direction:column;gap:2px;padding:10px 14px;background:${o.bg || '#fff'};border-radius:8px;border:1px solid ${o.border || '#f1f5f9'}">
      <span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">${label}</span>
      <span style="font-size:14px;font-weight:700;color:${o.color || '#0f172a'};font-family:${o.mono ? 'monospace' : 'inherit'}">${esc(val)}</span>
    </div>`;
  };

  // ── TAB: Equipo ──
  const tabEquipo = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:4px 0">
      ${_f('Código CMDB', activo.codigo, {mono:true, bg:'#f0f9ff', border:'#bae6fd'})}
      ${_f('N° de Serie', serie, {mono:true, bg:'#f0f9ff', border:'#bae6fd'})}
      ${_f('Cod. Inventario', serieObj.codInventario, {mono:true})}
      ${_f('Tipo de Equipo', activo.tipo)}
      ${_f('Equipo', activo.equipo || activo.tipo)}
      ${_f('Estado Equipo', activo.estadoEquipo + (activo.obsRetorno ? ' - ' + activo.obsRetorno : ''), {color: activo.estadoEquipo === 'NUEVO' ? '#16a34a' : activo.estadoEquipo === 'BUENO' ? '#2563eb' : '#d97706'})}
      ${_f('Origen', activo.origenEquipo)}
      ${_f('Gama', activo.gama)}
      ${_f('Fecha Ingreso', formatDate(activo.fechaIngreso))}
      ${_f('Fecha Compra', formatDate(activo.fechaCompra))}
    </div>
    ${activo.observaciones ? `<div style="margin-top:10px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">
      <span style="font-size:10px;font-weight:600;text-transform:uppercase;color:#92400e;letter-spacing:0.5px">Observaciones</span>
      <p style="margin:4px 0 0;font-size:13px;color:#78350f">${esc(activo.observaciones)}</p>
    </div>` : ''}`;

  // ── TAB: Especificaciones ──
  const tabSpecs = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:4px 0">
      ${_f('Marca', activo.marca, {bg:'#f8fafc', border:'#e2e8f0'})}
      ${_f('Modelo', activo.modelo, {bg:'#f8fafc', border:'#e2e8f0'})}
      ${_f('SKU', activo.sku, {mono:true})}
      ${esLaptopDesktop ? _f('Procesador', activo.procesador, {bg:'#faf5ff', border:'#e9d5ff'}) : ''}
      ${esLaptopDesktop ? _f('Memoria RAM', serieObj.ram || activo.memoria, {bg:'#ecfdf5', border:'#a7f3d0', color:'#065f46'}) : ''}
      ${esLaptopDesktop ? _f('Almacenamiento', serieObj.almacenamiento || activo.disco, {bg:'#eff6ff', border:'#bfdbfe', color:'#1e40af'}) : ''}
      ${esLaptopDesktop ? _f('Sistema Operativo', activo.sistemaOperativo, {bg:'#f0f9ff', border:'#bae6fd'}) : ''}
      ${_f('Gama', activo.gama)}
    </div>
    ${!esLaptopDesktop ? '<div style="padding:30px 0;text-align:center;color:#94a3b8;font-size:13px">Este tipo de equipo no tiene especificaciones de hardware detalladas.</div>' : ''}`;

  // ── TAB: Colaborador (si asignado) ──
  const tabUsuario = esAsignado ? `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;margin-bottom:14px">
      <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:800;flex-shrink:0">
        ${esc((colab ? colab.nombre : asig.colaboradorNombre || '').split(' ').map(p => p[0]).slice(0,2).join(''))}
      </div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:800;color:#1e3a5f">${esc(colab ? colab.nombre : asig.colaboradorNombre)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">${esc(colab ? (colab.cargo || '') : '')} ${colab && colab.area ? '— ' + esc(colab.area) : ''}</div>
      </div>
      <span style="padding:4px 10px;border-radius:16px;font-size:10px;font-weight:700;${colab && colab.estado === 'Activo' ? 'background:#dcfce7;color:#166534' : 'background:#fef2f2;color:#991b1b'}">${esc(colab ? colab.estado : '')}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${_f('DNI', colab ? colab.dni : '', {mono:true})}
      ${_f('Correo', colab ? colab.email : asig.correoColab)}
      ${_f('Área', colab ? colab.area : asig.area)}
      ${_f('Cargo', colab ? colab.cargo : '')}
      ${_f('Ubicación', colab ? colab.ubicacion : '')}
      ${_f('Perfil', colab ? colab.perfil : '')}
    </div>
    <div style="margin-top:14px;padding:1px 0;border-top:2px solid #e2e8f0"></div>
    <div style="margin-top:14px">
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b">Datos de Asignación</span>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
        ${_f('Motivo', asig.motivo, {bg:'#fefce8', border:'#fde68a'})}
        ${_f('Ticket', asig.ticket, {mono:true, bg:'#faf5ff', border:'#e9d5ff', color:'#7c3aed'})}
        ${_f('Fecha Asignación', formatDateTime(asig.fechaAsignacion))}
        ${_f('Acta Entrega', asig.actaEntrega || 'PENDIENTE', {color: asig.actaEntrega ? '#16a34a' : '#dc2626', bg: asig.actaEntrega ? '#f0fdf4' : '#fef2f2', border: asig.actaEntrega ? '#bbf7d0' : '#fecaca'})}
      </div>
    </div>
  ` : '';

  // ── TAB: Almacén (si disponible) ──
  const tabAlmacen = !esAsignado ? `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;margin-bottom:14px">
      <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;flex-shrink:0">🏢</div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:800;color:#14532d">${esc(activo.ubicacion || 'Sin ubicación')}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">Equipo disponible en almacén</div>
      </div>
      <span style="padding:4px 10px;border-radius:16px;font-size:10px;font-weight:700;background:#dcfce7;color:#166534">EN STOCK</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${_f('Sede / Ubicación', activo.ubicacion, {bg:'#f0fdf4', border:'#bbf7d0'})}
      ${_f('Ubicación Almacén', activo.ubicacionAlmacen, {bg:'#f0fdf4', border:'#bbf7d0'})}
      ${_f('Fecha Ingreso', formatDate(activo.fechaIngreso))}
      ${_f('Fecha Compra', formatDate(activo.fechaCompra))}
      ${_f('Estado Equipo', activo.estadoEquipo)}
      ${_f('Origen', activo.origenEquipo)}
    </div>
    ${activo.observaciones ? `<div style="margin-top:10px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">
      <span style="font-size:10px;font-weight:600;text-transform:uppercase;color:#92400e">Observaciones</span>
      <p style="margin:4px 0 0;font-size:13px;color:#78350f">${esc(activo.observaciones)}</p>
    </div>` : ''}
  ` : '';

  // ── TAB: Historial ──
  const tabHistorial = historial.length === 0
    ? '<div style="padding:40px 0;text-align:center;color:#94a3b8;font-size:13px">No hay registros de asignaciones para esta serie.</div>'
    : `<table style="width:100%;font-size:12px;border-collapse:collapse">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px">Fecha</th>
          <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px">Colaborador</th>
          <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px">Motivo</th>
          <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px">Ticket</th>
          <th style="padding:8px 10px;text-align:center;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px">Estado</th>
        </tr></thead>
        <tbody>
          ${historial.map(h => `<tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:8px 10px;font-size:12px">${formatDateTime(h.fechaAsignacion)}</td>
            <td style="padding:8px 10px;font-size:12px;font-weight:600">${esc(h.colaboradorNombre || '')}</td>
            <td style="padding:8px 10px;font-size:12px">${esc(h.motivo || '')}</td>
            <td style="padding:8px 10px;font-size:12px;font-family:monospace;color:#7c3aed">${esc(h.ticket || '')}</td>
            <td style="padding:8px 10px;text-align:center">
              <span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;${h.estado === 'Vigente' ? 'background:#dcfce7;color:#166534' : 'background:#f1f5f9;color:#64748b'}">${esc(h.estado)}</span>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;

  const tabContents = {
    equipo: tabEquipo,
    specs: tabSpecs,
    usuario: tabUsuario,
    almacen: tabAlmacen,
    historial: tabHistorial
  };

  openModal('', `
    <div style="display:flex;flex-direction:column;gap:0">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:16px;padding-bottom:16px;margin-bottom:0">
        <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,${esAsignado ? '#3b82f6,#1d4ed8' : '#10b981,#059669'});display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;box-shadow:0 4px 14px ${esAsignado ? 'rgba(59,130,246,.25)' : 'rgba(16,185,129,.25)'}">
          ${tipoIcon}
        </div>
        <div style="flex:1;min-width:0">
          <h2 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;line-height:1.2">${esc(activo.marca)} ${esc(activo.modelo)}</h2>
          <div style="font-size:12px;color:#64748b;margin-top:3px">${esc(activo.tipo)} &middot; S/N: <strong style="font-family:monospace;color:#334155">${esc(serie)}</strong></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
          <span style="padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.3px;${esAsignado
            ? 'background:#dbeafe;color:#1e40af;border:1px solid #93c5fd'
            : 'background:#dcfce7;color:#166534;border:1px solid #86efac'
          }">${esAsignado ? 'ASIGNADO' : 'DISPONIBLE'}</span>
          ${activo.estadoEquipo ? `<span style="padding:3px 10px;border-radius:16px;font-size:10px;font-weight:600;background:#f1f5f9;color:#475569">${esc(activo.estadoEquipo)}</span>` : ''}
        </div>
      </div>

      <!-- Tabs nav -->
      <div id="detalleSerieTabNav" style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:16px">
        ${tabs.map((t, i) => `
          <button onclick="_switchDetalleTab('${t.id}')" id="dsTab_${t.id}"
            style="padding:10px 20px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:none;color:${i === 0 ? '#2563eb' : '#94a3b8'};border-bottom:2px solid ${i === 0 ? '#2563eb' : 'transparent'};margin-bottom:-2px;transition:all .15s;display:flex;align-items:center;gap:6px"
            onmouseover="if(this.style.color!=='rgb(37, 99, 235)')this.style.color='#475569'"
            onmouseout="if(this.style.color!=='rgb(37, 99, 235)')this.style.color='#94a3b8'">
            <span style="font-size:14px">${t.icon}</span> ${t.label}
          </button>
        `).join('')}
      </div>

      <!-- Tab contents -->
      ${Object.entries(tabContents).map(([id, html]) =>
        `<div id="dsPanel_${id}" style="display:${id === tabs[0].id ? 'block' : 'none'};min-height:200px">${html}</div>`
      ).join('')}

    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
}

function _switchDetalleTab(tabId) {
  // Ocultar todos los paneles
  document.querySelectorAll('[id^="dsPanel_"]').forEach(p => p.style.display = 'none');
  // Resetear todos los tabs
  document.querySelectorAll('[id^="dsTab_"]').forEach(b => {
    b.style.color = '#94a3b8';
    b.style.borderBottom = '2px solid transparent';
  });
  // Mostrar panel activo
  const panel = document.getElementById('dsPanel_' + tabId);
  if (panel) panel.style.display = 'block';
  // Activar tab
  const tab = document.getElementById('dsTab_' + tabId);
  if (tab) {
    tab.style.color = '#2563eb';
    tab.style.borderBottom = '2px solid #2563eb';
  }
}

function renderInventario(el) {
  const rows = _buildInventarioRows();
  const totalAsignados = rows.filter(r => r.estadoCMDB === 'Asignado').length;
  const totalDisponibles = rows.filter(r => r.estadoCMDB === 'Disponible').length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Inventario CMDB</h1>
        <div class="subtitle">Vista detallada de equipos, asignaciones y estado</div>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-secondary" onclick="exportInventario()">📥 Exportar Excel</button>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon blue">🗄️</div></div>
        <div class="stat-value">${rows.length}</div>
        <div class="stat-label">Total equipos</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">✅</div></div>
        <div class="stat-value">${totalDisponibles}</div>
        <div class="stat-label">Disponibles</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon" style="background:#eff6ff;color:#2563eb">👤</div></div>
        <div class="stat-value">${totalAsignados}</div>
        <div class="stat-label">Asignados</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon" style="background:#fef9c3;color:#a16207">⚠️</div></div>
        <div class="stat-value">${rows.length - totalDisponibles - totalAsignados}</div>
        <div class="stat-label">Otros estados</div>
      </div>
    </div>

    <div class="table-toolbar">
      <div class="search-box" style="position:relative">
        <span class="search-icon">🔍</span>
        <input type="text" id="invSearchInput" placeholder="Buscar por sede, tipo, marca, serie, colaborador..."
               value="${esc(invSearch)}"
               oninput="_onInvSearch(this.value)">
        <span id="invSearchClear" onclick="_clearInvSearch()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;color:#94a3b8;font-size:16px;font-weight:700;width:24px;height:24px;display:${invSearch ? 'flex' : 'none'};align-items:center;justify-content:center;border-radius:50%;transition:all .15s" onmouseover="this.style.background='#fee2e2';this.style.color='#dc2626'" onmouseout="this.style.background='';this.style.color='#94a3b8'" title="Limpiar búsqueda">✕</span>
      </div>
    </div>
    <div id="invFiltersBar" style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap"></div>

    <div id="invTableWrap"></div>
  `;
  _renderInvFiltersBar();
  _renderInvTable();
}

function _renderInvFiltersBar() {
  const bar = document.getElementById('invFiltersBar');
  if (!bar) return;
  const rows = _buildInventarioRows();

  // Dropdowns de filtros activos
  let html = Object.keys(_invActiveFilters).map(key => {
    const opt = _INV_FILTER_OPTIONS.find(o => o.key === key);
    if (!opt) return '';
    const values = ['Todos', ...new Set(rows.map(r => r[key]).filter(Boolean))].sort((a, b) => a === 'Todos' ? -1 : b === 'Todos' ? 1 : a.localeCompare(b));
    const current = _invActiveFilters[key] || 'Todos';
    return `<div style="display:flex;align-items:center;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;height:34px;background:#fff">
      <select onchange="_invActiveFilters['${key}']=this.value;resetPage('inventario');_renderInvTable()" style="border:none;padding:0 8px 0 10px;font-size:11px;color:#334155;height:100%;cursor:pointer;background:transparent;min-width:120px">
        ${values.map(v => `<option value="${esc(v)}" ${current===v?'selected':''}>${v === 'Todos' ? esc(opt.label) + ': Todos' : esc(v)}</option>`).join('')}
      </select>
      <button onclick="_invRemoveFilter('${key}')" style="border:none;background:none;cursor:pointer;padding:0 6px;color:#94a3b8;font-size:14px;height:100%;display:flex;align-items:center" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#94a3b8'" title="Quitar filtro">✕</button>
    </div>`;
  }).join('');

  // Botón "+" para agregar filtros
  const inactiveFilters = _INV_FILTER_OPTIONS.filter(o => !_invActiveFilters.hasOwnProperty(o.key));
  if (inactiveFilters.length > 0) {
    html += `<div id="invFilterAddWrap" style="position:relative;display:inline-block">
      <button id="invFilterAddBtn" style="width:34px;height:34px;border-radius:8px;border:1px dashed #cbd5e1;background:#f8fafc;cursor:pointer;font-size:16px;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.borderColor='#2563eb';this.style.color='#2563eb'" onmouseout="this.style.borderColor='#cbd5e1';this.style.color='#64748b'" title="Agregar filtro">+</button>
      <div id="invFilterAddMenu" style="display:${_invFilterMenuOpen ? 'block' : 'none'};position:absolute;top:38px;left:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:6px 0;z-index:999;min-width:180px">
        <div style="padding:4px 12px 6px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Agregar filtro</div>
        ${inactiveFilters.map(o => `<div onclick="event.stopPropagation();_invAddFilter('${o.key}')" style="padding:7px 12px;font-size:12px;color:#334155;cursor:pointer;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
          <span style="color:#2563eb;font-size:14px">+</span> ${esc(o.label)}
        </div>`).join('')}
      </div>
    </div>`;
  }

  bar.innerHTML = html;

  // Bind click en botón "+" después de insertar HTML
  const addBtn = document.getElementById('invFilterAddBtn');
  if (addBtn) {
    addBtn.onclick = function(e) {
      e.stopPropagation();
      _invFilterMenuOpen = !_invFilterMenuOpen;
      const menu = document.getElementById('invFilterAddMenu');
      if (menu) menu.style.display = _invFilterMenuOpen ? 'block' : 'none';
    };
  }
}

function _invAddFilter(key) {
  _invActiveFilters[key] = 'Todos';
  _invFilterMenuOpen = false;
  resetPage('inventario');
  _renderInvFiltersBar();
  _renderInvTable();
}

function _invRemoveFilter(key) {
  delete _invActiveFilters[key];
  _invFilterMenuOpen = false;
  resetPage('inventario');
  _renderInvFiltersBar();
  _renderInvTable();
}

// Cerrar menú filtros al hacer click fuera
document.addEventListener('click', function(e) {
  if (_invFilterMenuOpen && !e.target.closest('#invFiltersBar')) {
    _invFilterMenuOpen = false;
    _renderInvFiltersBar();
  }
});

function _onInvSearch(val) {
  invSearch = val;
  const clearBtn = document.getElementById('invSearchClear');
  if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
  resetPage('inventario');
  clearTimeout(_invSearchTimer);
  _invSearchTimer = setTimeout(_renderInvTable, 120);
}

function _clearInvSearch() {
  invSearch = '';
  const inp = document.getElementById('invSearchInput');
  if (inp) inp.value = '';
  const clearBtn = document.getElementById('invSearchClear');
  if (clearBtn) clearBtn.style.display = 'none';
  resetPage('inventario');
  _renderInvTable();
}

function _renderInvTable() {
  const wrap = document.getElementById('invTableWrap');
  if (!wrap) return;

  const rows = _buildInventarioRows();
  const filtered = rows.filter(r => {
    // Filtros dinámicos activos
    for (const [key, val] of Object.entries(_invActiveFilters)) {
      if (val !== 'Todos' && r[key] !== val) return false;
    }
    if (!invSearch) return true;
    const s = invSearch.toLowerCase();
    return r.sede.toLowerCase().includes(s) ||
           r.tipo.toLowerCase().includes(s) ||
           r.equipo.toLowerCase().includes(s) ||
           r.marca.toLowerCase().includes(s) ||
           r.modelo.toLowerCase().includes(s) ||
           r.serie.toLowerCase().includes(s) ||
           r.codInventario.toLowerCase().includes(s) ||
           r.estadoCMDB.toLowerCase().includes(s) ||
           r.estadoEquipo.toLowerCase().includes(s) ||
           r.colaborador.toLowerCase().includes(s) ||
           r.correo.toLowerCase().includes(s) ||
           r.areaTrabajo.toLowerCase().includes(s) ||
           r.ticket.toLowerCase().includes(s);
  });

  const thStyle = 'padding:8px 6px;font-size:10px;background:var(--bg-secondary);white-space:nowrap;text-transform:uppercase;letter-spacing:0.3px';
  const tdStyle = 'padding:6px;font-size:11px;white-space:nowrap';

  wrap.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th style="${thStyle}">Sede</th>
              <th style="${thStyle}">Tipo Equipo</th>
              <th style="${thStyle}">Equipo</th>
              <th style="${thStyle}">Marca</th>
              <th style="${thStyle}">Modelo</th>
              <th style="${thStyle}">Serie</th>
              <th style="${thStyle}">Inv. Entel</th>
              <th style="${thStyle}">F. Asignación</th>
              <th style="${thStyle}">Motivo</th>
              <th style="${thStyle}">Acta Entrega</th>
              <th style="${thStyle}">Estado CMDB</th>
              <th style="${thStyle}">Estado Equipo</th>
              <th style="${thStyle}">Uso Equipo</th>
              <th style="${thStyle}">Área Trabajo</th>
              <th style="${thStyle}">Correo</th>
              <th style="${thStyle}">Colaborador / Posición</th>
              <th style="${thStyle}">Jefe / Responsable</th>
              <th style="${thStyle}">Ticket</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? '<tr><td colspan="18"><div class="empty-state"><div class="empty-icon">🗄️</div><h3>Sin resultados</h3><p>No se encontraron equipos</p></div></td></tr>'
              : pagSlice(filtered, 'inventario').map(r => {
                  const estadoBadge = r.estadoCMDB === 'Disponible' ? 'badge-success' :
                    r.estadoCMDB === 'Asignado' ? 'badge-info' :
                    r.estadoCMDB === 'Pendiente Retorno' ? 'badge-warning' :
                    r.estadoCMDB === 'En Mantenimiento' ? 'badge-warning' : 'badge-danger';
                  return `
                    <tr>
                      <td style="${tdStyle}">${esc(r.sede || '—')}</td>
                      <td style="${tdStyle}">${esc(r.tipo || '—')}</td>
                      <td style="${tdStyle}">${esc(r.equipo || '—')}</td>
                      <td style="${tdStyle}">${esc(r.marca || '—')}</td>
                      <td style="${tdStyle}">${esc(r.modelo || '—')}</td>
                      <td style="${tdStyle};font-family:monospace">${r.serie ? `<a href="#" onclick="verDetalleSerie(${r.activoId},'${esc(r.serie)}');return false" style="color:var(--primary);text-decoration:underline;cursor:pointer;font-weight:600">${esc(r.serie)}</a>` : '—'}</td>
                      <td style="${tdStyle};font-family:monospace">${esc(r.codInventario || '—')}</td>
                      <td style="${tdStyle}">${formatDate(r.fechaAsignacion)}</td>
                      <td style="${tdStyle}">${esc(r.motivo || '—')}</td>
                      <td style="${tdStyle}${r.actaEntrega === 'PENDIENTE' ? ';color:#dc2626;font-weight:600' : ''}">${esc(r.actaEntrega || '—')}</td>
                      <td style="${tdStyle}"><span class="badge ${estadoBadge}" style="font-size:9px">${esc(r.estadoCMDB || '—')}</span></td>
                      <td style="${tdStyle}">${esc(r.estadoEquipo || '—')}</td>
                      <td style="${tdStyle}${r.usoEquipo === 'PENDIENTE RETORNO' ? ';color:#ea580c;font-weight:600' : ''}">${esc(r.usoEquipo || '—')}</td>
                      <td style="${tdStyle}">${esc(r.areaTrabajo || '—')}</td>
                      <td style="${tdStyle};font-size:10px">${esc(r.correo || '—')}</td>
                      <td style="${tdStyle}">${esc(r.colaborador || '—')}</td>
                      <td style="${tdStyle}">${esc(r.jefe || '—')}</td>
                      <td style="${tdStyle};font-family:monospace">${esc(r.ticket || '—')}</td>
                    </tr>
                  `;
                }).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        ${pagFooter('inventario', filtered.length)}
      </div>
    </div>
  `;
}

function exportInventario() {
  const rows = _buildInventarioRows();
  const headers = ['SEDE','TIPO_EQUIPO','EQUIPO','MARCA','MODELO','SERIE','INV_ENTEL','FECHA_ASIGNACION','MOTIVO','ACTA_ENTREGA','ESTADO_CMDB','ESTADO_EQUIPO','USO_EQUIPO','AREA_TRABAJO','CORREO','COLABORADOR_POSICION','JEFE_RESPONSABLE','TICKET'];
  const data = rows.map(r => [r.sede,r.tipo,r.equipo,r.marca,r.modelo,r.serie,r.codInventario,formatDate(r.fechaAsignacion),r.motivo,r.actaEntrega,r.estadoCMDB,r.estadoEquipo,r.usoEquipo,r.areaTrabajo,r.correo,r.colaborador,r.jefe,r.ticket]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario CMDB');
  XLSX.writeFile(wb, 'Inventario_CMDB.xlsx');
  showToast('Inventario exportado correctamente');
}

/* ═══════════════════════════════════════════════════════
   BITACORA - MOVIMIENTOS (Módulo reestructurado)
   ═══════════════════════════════════════════════════════ */
let _bitSearch = '';
let _bitFilterMov = 'Todos';
let _bitFilterEstado = 'Todos';
let _bitSearchTimer = null;

// Almacén de archivos adjuntos (base64) - persistido en localStorage
const _bitArchivos = {
  get() { return DB.get('bitacoraArchivos'); },
  set(data) { DB.set('bitacoraArchivos', data); },
  save(movId, fileData) {
    const arch = this.get();
    arch.push({ movId, ...fileData });
    this.set(arch);
  },
  find(movId) { return this.get().find(a => a.movId === movId); }
};

function _initBitacoraData() {
  if (!localStorage.getItem('ati_bitacoraMovimientos')) {
    DB.set('bitacoraMovimientos', []);
  }
  if (!localStorage.getItem('ati_bitacoraArchivos')) {
    DB.set('bitacoraArchivos', []);
  }
}

// Limpia el campo almacén: solo deja el nombre del almacén sin rutas ni usuarios
function _limpiarAlmacen(val) {
  if (!val) return '';
  let s = val;
  // Quitar patrones como "→ Usuario Final (...)" o "→ Baja (...)"
  s = s.replace(/\s*→\s*Usuario Final\s*\([^)]*\)/gi, '');
  s = s.replace(/\s*→\s*Baja\s*\([^)]*\)/gi, '');
  s = s.replace(/\s*→\s*Usuario\s*\([^)]*\)/gi, '');
  // Quitar patrones como "Proveedor → " o "Usuario (...) → "
  s = s.replace(/^Proveedor\s*→\s*/gi, '');
  s = s.replace(/^Usuario\s*\([^)]*\)\s*→\s*/gi, '');
  return s.trim() || val.trim();
}

// Auto-registra un movimiento en la bitácora estructurada
function _autoBitacora(opts) {
  _initBitacoraData();
  const movs = DB.get('bitacoraMovimientos');

  // Buscar ticket automáticamente desde asignaciones por serie del equipo
  let ticketVal = opts.ticket || '';
  if (!ticketVal && opts.serie) {
    const asigs = DB.get('asignaciones');
    const serieUpper = (opts.serie || '').toUpperCase();
    const asig = asigs.find(a => (a.serieAsignada || '').toUpperCase() === serieUpper) || {};
    ticketVal = asig.ticket || '';
  }

  const record = {
    id: nextId(movs),
    movimiento: (opts.movimiento || 'SALIDA').toUpperCase(),
    almacen: (opts.almacen || '').toUpperCase(),
    tipoEquipo: (opts.tipoEquipo || '').toUpperCase(),
    equipo: (opts.equipo || '').toUpperCase(),
    modelo: (opts.modelo || '').toUpperCase(),
    serie: (opts.serie || '').toUpperCase(),
    inv: (opts.inv || '').toUpperCase(),
    correo: opts.correo || '',
    motivo: (opts.motivo || '').toUpperCase(),
    gestor: opts.gestor || (currentUser ? (currentUser.usuario || currentUser.nombre) : 'Sistema'),
    ticket: ticketVal.toUpperCase(),
    estadoAsignacion: 'PENDIENTE',
    actaCorrelativo: '',
    fechaRegistro: today()
  };
  movs.unshift(record);
  DB.set('bitacoraMovimientos', movs);
}

function _nextActaCorrelativo() {
  const movs = DB.get('bitacoraMovimientos');
  const actas = movs.filter(m => m.actaCorrelativo).map(m => {
    const num = parseInt(m.actaCorrelativo.replace('ACT', ''));
    return isNaN(num) ? 0 : num;
  });
  const max = actas.length > 0 ? Math.max(...actas) : 0;
  return 'ACT' + String(max + 1).padStart(5, '0');
}

function renderMovimientos(el) {
  _initBitacoraData();

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Bitacora de Movimientos</h1>
        <div class="subtitle">Registro operativo de traslados y movimientos de equipos entre almacenes</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="openBitacoraModal()">+ Nuevo Movimiento</button>
        <button class="btn" onclick="exportBitacoraExcel()" style="background:#059669;color:#fff;border-color:#059669">📥 Exportar Excel</button>
      </div>
    </div>

    <div class="table-toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="bitSearchInput" placeholder="Buscar por almacen, equipo, modelo, serie, correo, gestor..."
               value="${esc(_bitSearch)}"
               oninput="_onBitSearch(this.value)">
      </div>
      <div class="toolbar-actions">
        <div class="filter-chips">
          <button class="filter-chip ${_bitFilterMov === 'Todos' ? 'active' : ''}" onclick="_setBitFilterMov('Todos')">Todos</button>
          <button class="filter-chip ${_bitFilterMov === 'INGRESO' ? 'active' : ''}" onclick="_setBitFilterMov('INGRESO')">Ingresos</button>
          <button class="filter-chip ${_bitFilterMov === 'SALIDA' ? 'active' : ''}" onclick="_setBitFilterMov('SALIDA')">Salidas</button>
          <button class="filter-chip ${_bitFilterMov === 'CANCELADO' ? 'active' : ''}" onclick="_setBitFilterMov('CANCELADO')" style="color:#dc2626">Cancelados</button>
        </div>
        <div class="filter-chips" style="margin-left:8px">
          <button class="filter-chip ${_bitFilterEstado === 'Todos' ? 'active' : ''}" onclick="_setBitFilterEstado('Todos')">Todos</button>
          <button class="filter-chip ${_bitFilterEstado === 'PENDIENTE' ? 'active' : ''}" onclick="_setBitFilterEstado('PENDIENTE')" style="color:#d97706">Pendientes</button>
          <button class="filter-chip ${_bitFilterEstado === 'ATENDIDO' ? 'active' : ''}" onclick="_setBitFilterEstado('ATENDIDO')" style="color:#059669">Atendidos</button>
          <button class="filter-chip ${_bitFilterEstado === 'ANULADO' ? 'active' : ''}" onclick="_setBitFilterEstado('ANULADO')" style="color:#dc2626">Anulados</button>
        </div>
      </div>
    </div>

    <div id="bitTableWrap"></div>
  `;
  _renderBitTable();
}

function _onBitSearch(val) {
  _bitSearch = val;
  resetPage('bitacora');
  clearTimeout(_bitSearchTimer);
  _bitSearchTimer = setTimeout(_renderBitTable, 120);
}

function _setBitFilterMov(val) {
  _bitFilterMov = val;
  resetPage('bitacora');
  _renderBitTable();
}

function _setBitFilterEstado(val) {
  _bitFilterEstado = val;
  resetPage('bitacora');
  _renderBitTable();
}

function _renderBitTable() {
  const wrap = document.getElementById('bitTableWrap');
  if (!wrap) return;
  const movs = DB.get('bitacoraMovimientos');

  const filtered = movs.filter(m => {
    if (_bitFilterMov !== 'Todos' && m.movimiento !== _bitFilterMov) return false;
    if (_bitFilterEstado === 'PENDIENTE' && m.estadoAsignacion !== 'PENDIENTE') return false;
    if (_bitFilterEstado === 'ATENDIDO' && m.estadoAsignacion !== 'ATENDIDO') return false;
    if (_bitFilterEstado === 'ANULADO' && m.estadoAsignacion !== 'ANULADO') return false;
    if (_bitSearch) {
      const s = _bitSearch.toLowerCase();
      return (m.almacen || '').toLowerCase().includes(s) ||
             (m.equipo || '').toLowerCase().includes(s) ||
             (m.modelo || '').toLowerCase().includes(s) ||
             (m.serie || '').toLowerCase().includes(s) ||
             (m.inv || '').toLowerCase().includes(s) ||
             (m.correo || '').toLowerCase().includes(s) ||
             (m.gestor || '').toLowerCase().includes(s) ||
             (m.ticket || '').toLowerCase().includes(s) ||
             (m.actaCorrelativo || '').toLowerCase().includes(s) ||
             (m.movimiento || '').toLowerCase().includes(s) ||
             (m.motivo || '').toLowerCase().includes(s);
    }
    return true;
  });

  wrap.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table class="bitacora-table">
          <thead>
            <tr>
              <th style="min-width:50px">ID</th>
              <th style="min-width:100px">Movimiento</th>
              <th style="min-width:100px">Fecha</th>
              <th style="min-width:200px">Almacen</th>
              <th style="min-width:140px">Equipo</th>
              <th style="min-width:130px">Modelo</th>
              <th style="min-width:130px">Serie</th>
              <th style="min-width:100px">INV</th>
              <th style="min-width:120px">Motivo</th>
              <th style="min-width:120px">Estado Asign.</th>
              <th style="min-width:150px">Acta Asignacion</th>
              <th style="min-width:120px">Ticket</th>
              <th style="min-width:180px">Correo</th>
              <th style="min-width:130px">Gestor</th>
              <th style="min-width:90px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? '<tr><td colspan="15"><div class="empty-state"><div class="empty-icon">📋</div><h3>Sin movimientos registrados</h3><p>Registra un nuevo movimiento para comenzar</p></div></td></tr>'
              : pagSlice(filtered, 'bitacora').map(m => {
                  const isCancelado = (m.movimiento || '').toUpperCase() === 'CANCELADO';

                  const estadoBadge = m.estadoAsignacion === 'ANULADO'
                    ? `<span class="badge bit-badge-estado" style="background:transparent;color:#dc2626;border:none;font-weight:700">ANULADO</span>`
                    : m.estadoAsignacion === 'ATENDIDO'
                    ? `<span class="badge badge-success bit-badge-estado">ATENDIDO</span>`
                    : `<span class="badge badge-warning bit-badge-estado">PENDIENTE</span>`;

                  const actaHTML = isCancelado
                    ? `<button class="btn bit-btn-cargar" disabled style="opacity:0.5;cursor:not-allowed">📎 Cargar acta</button>`
                    : m.actaCorrelativo
                    ? `<span class="bit-acta-link" onclick="verActaAdjunta(${m.id})" title="Ver acta adjunta">${esc(m.actaCorrelativo)}</span>`
                    : `<button class="btn bit-btn-cargar" onclick="cargarActaBitacora(${m.id})">📎 Cargar acta</button>`;

                  const movBadge = isCancelado
                    ? `<span class="badge" style="background:transparent;color:#dc2626;border:none;font-weight:700"><span style="font-size:10px">✕</span> ${esc(m.movimiento)}</span>`
                    : m.movimiento === 'INGRESO'
                    ? `<span class="badge badge-success"><span style="font-size:10px">←</span> ${esc(m.movimiento)}</span>`
                    : `<span class="badge badge-info"><span style="font-size:10px">→</span> ${esc(m.movimiento)}</span>`;

                  return `
                  <tr>
                    <td style="font-weight:600;text-align:center">${m.id}</td>
                    <td>${movBadge}</td>
                    <td style="font-size:12px">${formatDate(m.fechaRegistro)}</td>
                    <td style="font-size:12px">${esc(_limpiarAlmacen(m.almacen) || '-')}</td>
                    <td>${esc(m.equipo || '-')}</td>
                    <td style="font-size:12px">${esc(m.modelo || '-')}</td>
                    <td style="font-size:12px;font-family:monospace">${esc(m.serie || '-')}</td>
                    <td style="font-size:12px">${esc(m.inv || '-')}</td>
                    <td style="font-size:11px">${esc(m.motivo || '-')}</td>
                    <td>${estadoBadge}</td>
                    <td>${actaHTML}</td>
                    <td style="font-size:12px;font-family:monospace">${esc(m.ticket || '-')}</td>
                    <td style="font-size:12px">${esc(m.correo || '-')}</td>
                    <td>${esc(m.gestor || '-')}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-icon" title="Editar" onclick="openBitacoraModal(${m.id})">✏️</button>
                        <button class="btn-icon" title="Eliminar" onclick="deleteBitacoraMov(${m.id})" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca">🗑️</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">${pagFooter('bitacora', filtered.length)}</div>
    </div>
  `;
}

/* --- Modal Nuevo/Editar Movimiento --- */
function openBitacoraModal(editId) {
  _initBitacoraData();
  const movs = DB.get('bitacoraMovimientos');
  const m = editId ? movs.find(x => x.id === editId) : null;

  const gestores = DB.get('gestores').filter(g => g.estado === 'Activo');
  const gestorOpts = gestores.map(g => `<option value="${esc(g.usuario || g.nombre)}" ${m && m.gestor === (g.usuario || g.nombre) ? 'selected' : ''}>${esc(g.usuario || g.nombre)}</option>`).join('');

  const body = `
    <div class="form-grid">
      <div class="form-group">
        <label>Movimiento <span class="required">*</span></label>
        <select id="bitMovimiento" class="form-control">
          <option value="">-- Seleccionar --</option>
          <option value="INGRESO" ${m && m.movimiento === 'INGRESO' ? 'selected' : ''}>INGRESO</option>
          <option value="SALIDA" ${m && m.movimiento === 'SALIDA' ? 'selected' : ''}>SALIDA</option>
        </select>
      </div>
      <div class="form-group">
        <label>Almacen (Origen → Destino) <span class="required">*</span></label>
        <input id="bitAlmacen" class="form-control" placeholder="Ej: Almacen TI → Almacen Lurin" value="${m ? esc(m.almacen) : ''}">
      </div>
      <div class="form-group">
        <label>Equipo <span class="required">*</span></label>
        <input id="bitEquipo" class="form-control" placeholder="Descripcion del activo" value="${m ? esc(m.equipo) : ''}">
      </div>
      <div class="form-group">
        <label>Modelo</label>
        <input id="bitModelo" class="form-control" placeholder="Modelo comercial o tecnico" value="${m ? esc(m.modelo) : ''}">
      </div>
      <div class="form-group">
        <label>Serie <span class="required">*</span></label>
        <input id="bitSerie" class="form-control" placeholder="Numero de serie" value="${m ? esc(m.serie) : ''}">
      </div>
      <div class="form-group">
        <label>INV (Cod. Patrimonial)</label>
        <input id="bitInv" class="form-control" placeholder="Codigo de inventario" value="${m ? esc(m.inv) : ''}">
      </div>
      <div class="form-group">
        <label>Ticket</label>
        <input id="bitTicket" class="form-control" placeholder="Numero de ticket" value="${m ? esc(m.ticket) : ''}">
      </div>
      <div class="form-group">
        <label>Correo</label>
        <input id="bitCorreo" class="form-control" placeholder="correo@empresa.com" value="${m ? esc(m.correo) : ''}" style="text-transform:none">
      </div>
      <div class="form-group">
        <label>Gestor <span class="required">*</span></label>
        <select id="bitGestor" class="form-control">
          <option value="">-- Seleccionar --</option>
          ${gestorOpts}
          ${currentUser && !gestores.find(g => g.nombre === currentUser.nombre) ? `<option value="${esc(currentUser.nombre)}" selected>${esc(currentUser.nombre)}</option>` : ''}
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveBitacoraMovimiento(${editId || 0})">${editId ? 'Actualizar' : 'Registrar'}</button>
  `;

  openModal(editId ? 'Editar Movimiento' : 'Nuevo Movimiento', body, footer, 'modal-lg');

  // Auto-seleccionar gestor actual si es nuevo
  if (!editId && currentUser) {
    const sel = document.getElementById('bitGestor');
    if (sel) {
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === currentUser.nombre) {
          sel.selectedIndex = i;
          break;
        }
      }
    }
  }
}

function saveBitacoraMovimiento(editId) {
  const movimiento = document.getElementById('bitMovimiento').value;
  const almacen = document.getElementById('bitAlmacen').value.trim();
  const equipo = document.getElementById('bitEquipo').value.trim();
  const modelo = document.getElementById('bitModelo').value.trim();
  const serie = document.getElementById('bitSerie').value.trim();
  const inv = document.getElementById('bitInv').value.trim();
  const ticket = document.getElementById('bitTicket').value.trim();
  const correo = document.getElementById('bitCorreo').value.trim();
  const gestor = document.getElementById('bitGestor').value;

  if (!movimiento || !almacen || !equipo || !serie || !gestor) {
    showToast('Completa los campos obligatorios', 'error');
    return;
  }

  const movs = DB.get('bitacoraMovimientos');

  const record = upperFields({
    movimiento,
    almacen,
    equipo,
    modelo,
    serie,
    inv,
    correo
  });
  record.ticket = ticket;
  record.gestor = gestor;

  if (editId) {
    const idx = movs.findIndex(m => m.id === editId);
    if (idx >= 0) {
      record.id = editId;
      record.estadoAsignacion = movs[idx].estadoAsignacion || 'PENDIENTE';
      record.actaCorrelativo = movs[idx].actaCorrelativo || '';
      record.fechaRegistro = movs[idx].fechaRegistro;
      movs[idx] = record;
    }
  } else {
    record.id = nextId(movs);
    record.estadoAsignacion = 'PENDIENTE';
    record.actaCorrelativo = '';
    record.fechaRegistro = today();
    movs.unshift(record);
  }

  DB.set('bitacoraMovimientos', movs);
  addMovimiento(editId ? 'Edicion Bitacora' : 'Nuevo Mov. Bitacora', `${record.movimiento}: ${record.almacen} — ${record.equipo} (${record.serie})`);
  closeModal();
  showToast(editId ? 'Movimiento actualizado' : 'Movimiento registrado');
  renderPage();
}

function deleteBitacoraMov(id) {
  if (!confirm('¿Eliminar este registro de movimiento?')) return;
  const movs = DB.get('bitacoraMovimientos').filter(m => m.id !== id);
  DB.set('bitacoraMovimientos', movs);
  // Eliminar archivo adjunto si existe
  const arch = DB.get('bitacoraArchivos').filter(a => a.movId !== id);
  DB.set('bitacoraArchivos', arch);
  addMovimiento('Eliminacion Bitacora', `Movimiento #${id} eliminado`);
  showToast('Registro eliminado');
  renderPage();
}

/* --- Carga de Acta de Asignacion --- */
function cargarActaBitacora(movId) {
  const body = `
    <div style="text-align:center;padding:20px 0">
      <p style="margin-bottom:16px;color:var(--text-secondary)">Selecciona un archivo PDF o imagen para adjuntar como Acta de Asignacion.</p>
      <div class="bit-upload-zone" id="bitUploadZone" onclick="document.getElementById('bitFileInput').click()">
        <div class="bit-upload-icon">📄</div>
        <p style="font-weight:500;margin-bottom:4px">Arrastra un archivo aqui o haz clic para seleccionar</p>
        <p style="font-size:12px;color:var(--text-muted)">PDF, JPG, PNG (max 5MB)</p>
      </div>
      <input type="file" id="bitFileInput" accept=".pdf,.jpg,.jpeg,.png" style="display:none" onchange="_onBitFileSelected(this, ${movId})">
      <div id="bitFilePreview" style="margin-top:16px"></div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" id="bitUploadBtn" onclick="_confirmActaUpload(${movId})" disabled>Adjuntar Acta</button>
  `;

  openModal('Cargar Acta de Asignacion', body, footer);

  // Drag & drop
  setTimeout(() => {
    const zone = document.getElementById('bitUploadZone');
    if (zone) {
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
          document.getElementById('bitFileInput').files = e.dataTransfer.files;
          _onBitFileSelected(document.getElementById('bitFileInput'), movId);
        }
      });
    }
  }, 100);
}

let _bitPendingFile = null;

function _onBitFileSelected(input, movId) {
  const file = input.files[0];
  if (!file) return;

  const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    showToast('Solo se permiten archivos PDF, JPG o PNG', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('El archivo no debe superar 5MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    _bitPendingFile = {
      name: file.name,
      type: file.type,
      data: e.target.result,
      size: file.size
    };

    const preview = document.getElementById('bitFilePreview');
    const icon = file.type === 'application/pdf' ? '📄' : '🖼️';
    const sizeKB = (file.size / 1024).toFixed(1);
    preview.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;justify-content:center;padding:10px;background:var(--bg);border-radius:var(--radius-sm)">
        <span style="font-size:24px">${icon}</span>
        <div style="text-align:left">
          <div style="font-weight:500;font-size:13px">${esc(file.name)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${sizeKB} KB</div>
        </div>
      </div>
    `;
    document.getElementById('bitUploadBtn').disabled = false;
  };
  reader.readAsDataURL(file);
}

function _confirmActaUpload(movId) {
  if (!_bitPendingFile) return;

  const movs = DB.get('bitacoraMovimientos');
  const idx = movs.findIndex(m => m.id === movId);
  if (idx < 0) return;

  const correlativo = _nextActaCorrelativo();

  // Guardar archivo
  _bitArchivos.save(movId, {
    correlativo,
    name: _bitPendingFile.name,
    type: _bitPendingFile.type,
    data: _bitPendingFile.data
  });

  // Buscar todos los movimientos relacionados (misma atención: mismo ticket + correo + fecha)
  const ref = movs[idx];
  const _refTicket = (ref.ticket || '').toUpperCase().trim();
  const _refCorreo = (ref.correo || '').toUpperCase().trim();
  const _refFecha = (ref.fechaRegistro || '').split('T')[0];
  const _relatedIds = [];

  movs.forEach((m, i) => {
    const mTicket = (m.ticket || '').toUpperCase().trim();
    const mCorreo = (m.correo || '').toUpperCase().trim();
    const mFecha = (m.fechaRegistro || '').split('T')[0];
    if (_refTicket && mTicket === _refTicket && mCorreo === _refCorreo && mFecha === _refFecha) {
      m.actaCorrelativo = correlativo;
      m.estadoAsignacion = 'ATENDIDO';
      _relatedIds.push(m.id);
      // Guardar el mismo archivo para cada movimiento relacionado
      if (m.id !== movId) {
        _bitArchivos.save(m.id, {
          correlativo,
          name: _bitPendingFile.name,
          type: _bitPendingFile.type,
          data: _bitPendingFile.data
        });
      }
    }
  });

  // Si no se encontraron relacionados por ticket (fallback), actualizar solo el actual
  if (_relatedIds.length === 0) {
    movs[idx].actaCorrelativo = correlativo;
    movs[idx].estadoAsignacion = 'ATENDIDO';
    _relatedIds.push(movId);
  }

  DB.set('bitacoraMovimientos', movs);

  // Sincronizar correlativo con asignaciones (para que aparezca en CMDB)
  const asigs = DB.get('asignaciones');
  let _asigChanged = false;
  _relatedIds.forEach(rid => {
    const rm = movs.find(m => m.id === rid);
    if (!rm) return;
    const serieSync = (rm.serie || '').toUpperCase().trim();
    if (serieSync) {
      const asigIdx = asigs.findIndex(a => a.estado === 'Vigente' && (a.serieAsignada || '').toUpperCase().trim() === serieSync);
      if (asigIdx >= 0) {
        asigs[asigIdx].actaEntrega = correlativo;
        _asigChanged = true;
      }
    }
  });
  if (_asigChanged) DB.set('asignaciones', asigs);

  _bitPendingFile = null;
  const _countRel = _relatedIds.length;
  addMovimiento('Acta Cargada', `Acta ${correlativo} adjuntada a ${_countRel} movimiento(s) de la atención [${_refTicket}]`);
  closeModal();
  showToast(_countRel > 1
    ? `Acta adjuntada a ${_countRel} registros de la misma atención — ${correlativo}`
    : 'Acta adjuntada correctamente — ' + correlativo);
  renderPage();
}

function verActaAdjunta(movId) {
  const archivo = _bitArchivos.find(movId);
  if (!archivo) {
    showToast('No se encontro el archivo adjunto', 'error');
    return;
  }

  let previewHTML = '';
  if (archivo.type === 'application/pdf') {
    previewHTML = `<iframe src="${archivo.data}" style="width:100%;height:500px;border:none;border-radius:var(--radius-sm)"></iframe>`;
  } else {
    previewHTML = `<img src="${archivo.data}" style="max-width:100%;max-height:500px;border-radius:var(--radius-sm);display:block;margin:0 auto">`;
  }

  const body = `
    <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <span class="badge badge-success" style="font-size:13px;padding:6px 14px">${esc(archivo.correlativo)}</span>
        <span style="margin-left:10px;font-size:13px;color:var(--text-secondary)">${esc(archivo.name)}</span>
      </div>
      <a href="${archivo.data}" download="${esc(archivo.name)}" class="btn btn-secondary" style="font-size:12px;padding:6px 12px">Descargar</a>
    </div>
    ${previewHTML}
  `;

  openModal('Acta de Asignacion', body, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>', 'modal-lg');
}

/* --- Exportar Bitacora a Excel --- */
function exportBitacoraExcel() {
  const movs = DB.get('bitacoraMovimientos');
  if (movs.length === 0) { showToast('No hay movimientos para exportar', 'error'); return; }

  const headers = ['ID', 'MOVIMIENTO', 'FECHA', 'ALMACEN', 'EQUIPO', 'MODELO', 'SERIE', 'INV', 'ESTADO_ASIGNACION', 'ACTA_ASIGNACION', 'TICKET', 'CORREO', 'GESTOR'];
  const data = movs.map(m => [m.id, m.movimiento, formatDate(m.fechaRegistro), _limpiarAlmacen(m.almacen), m.equipo, m.modelo, m.serie, m.inv, m.estadoAsignacion, m.actaCorrelativo || '', m.ticket || '', m.correo, m.gestor]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bitacora Movimientos');
  XLSX.writeFile(wb, 'Bitacora_Movimientos.xlsx');
  showToast('Bitacora exportada correctamente');
}

/* ═══════════════════════════════════════════════════════
   BITACORA - PENDIENTES RETORNO
   ═══════════════════════════════════════════════════════ */
function renderPendientesRetorno(el) {
  const asignaciones = DB.get('asignaciones');
  const activos = DB.get('activos');
  const colaboradores = DB.get('colaboradores');

  // 1. Equipos vigentes de colaboradores cesados
  const cesadosIds = new Set(colaboradores.filter(c => c.estado === 'Cesado').map(c => c.id));
  const porCese = asignaciones.filter(a => a.estado === 'Vigente' && cesadosIds.has(a.colaboradorId))
    .map(a => ({ ...a, _motivo: 'CESE DE COLABORADOR' }));

  // 2. Equipos con flag pendienteRetorno (por reemplazo o renovación)
  const porReemplazo = asignaciones.filter(a => a.estado === 'Vigente' && a.pendienteRetorno)
    .map(a => ({ ...a, _motivo: a.motivoReemplazo || 'REEMPLAZO' }));

  const pendientes = [...porCese, ...porReemplazo];

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Pendientes de Retorno</h1>
        <div class="subtitle">Activos pendientes de devolución por cese o reemplazo</div>
      </div>
    </div>
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>Equipo</th>
            <th>Modelo</th>
            <th>Serie</th>
            <th>Motivo</th>
            <th>Colaborador</th>
            <th>Fecha Atención</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            ${pendientes.length === 0
              ? '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">✅</div><h3>Sin pendientes</h3><p>No hay activos pendientes de retorno</p></div></td></tr>'
              : pagSlice(pendientes, 'pendientes').map(a => {
                  const act = activos.find(x => x.id === a.activoId);
                  return `
                  <tr>
                    <td><strong>${esc(a.activoTipo || '')}</strong> — ${esc(a.activoCodigo || '')}</td>
                    <td>${esc(a.activoMarca || '')} ${esc(a.activoModelo || '')}</td>
                    <td style="font-family:monospace;font-size:11px">${esc(a.serieAsignada || '—')}</td>
                    <td><span class="badge ${a._motivo === 'REPOSICIÓN ROBO' ? 'badge-danger' : a._motivo === 'REPOSICIÓN DAÑO FÍSICO' ? 'badge-warning' : a._motivo === 'REEMPLAZO' || a._motivo === 'RENOVACIÓN' ? 'badge-info' : 'badge-warning'}" style="font-size:10px">${esc(a._motivo)}</span></td>
                    <td>${esc(a.colaboradorNombre || '')}</td>
                    <td>${formatDate(['REEMPLAZO','RENOVACIÓN','REPOSICIÓN DAÑO FÍSICO','REPOSICIÓN ROBO'].includes(a._motivo) ? a.fechaReemplazo || a.fechaAsignacion : a.fechaAsignacion)}</td>
                    <td><span class="badge badge-warning" style="font-size:10px"><span class="badge-dot"></span>Pendiente</span></td>
                    <td><button class="btn btn-sm ${a._motivo === 'REPOSICIÓN ROBO' ? 'btn-danger' : 'btn-success'}" onclick="confirmarRetorno(${a.id},'${esc(a._motivo)}')">${a._motivo === 'REPOSICIÓN ROBO' ? 'Registrar Baja por Robo' : 'Confirmar Retorno'}</button></td>
                  </tr>`;
                }).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">${pagFooter('pendientes', pendientes.length)}</div>
    </div>
  `;
}

let _retornoAsigId = null;
let _retornoMotivo = '';

function confirmarRetorno(asigId, motivo) {
  _retornoAsigId = asigId;
  _retornoMotivo = motivo;
  _retornoDenunciaFile = null;

  const asignaciones = DB.get('asignaciones');
  const activos = DB.get('activos');
  const rec = asignaciones.find(a => a.id === asigId);
  if (!rec) return;
  const act = activos.find(a => a.id === rec.activoId);

  const _esRobo = (motivo || '').toUpperCase().includes('REPOSICIÓN ROBO');

  const PARTES_EQUIPO = ['BACKCOVER','TOPCOVER','BASE COVER','PANTALLA','TECLADO','PUERTO USB','PLACA MADRE','CAMARA','PARLANTE','TOUCH PAD','DISCO DURO','RAM','BISAGRAS','VENTILADOR','OTRO'];

  openModal(_esRobo ? 'Baja por Robo' : 'Confirmar Retorno', `
    <div style="display:flex;flex-direction:column;gap:16px">
      ${_esRobo ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;font-size:12px;color:#991b1b;display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">🚨</span>
        <span><strong>Reposición por Robo</strong> — El equipo no será retornado físicamente. Este proceso registra la baja del activo robado. Se requiere adjuntar la denuncia de robo.</span>
      </div>` : ''}

      <!-- Info del equipo -->
      <div style="background:${_esRobo ? '#fef2f2' : '#f8fafc'};border-radius:8px;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase">${_esRobo ? 'Equipo Robado' : 'Equipo'}</div>
          <div style="font-size:13px;font-weight:700">${esc(rec.activoTipo || '')} — ${esc(rec.activoCodigo || '')}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase">Modelo</div>
          <div style="font-size:13px">${esc(rec.activoMarca || '')} ${esc(rec.activoModelo || '')}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase">Serie</div>
          <div style="font-size:12px;font-family:monospace">${esc(rec.serieAsignada || '—')}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase">Colaborador</div>
          <div style="font-size:13px">${esc(rec.colaboradorNombre || '')}</div>
        </div>
      </div>

      ${_esRobo ? `
      <!-- ROBO: Denuncia obligatoria -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:6px;display:block">🚨 Denuncia de Robo <span class="required">*</span></label>
        <div id="retornoDenunciaWrap" style="border:2px dashed #fecaca;border-radius:8px;padding:16px;text-align:center;background:#fff;cursor:pointer;transition:all .15s"
          onclick="document.getElementById('retornoDenunciaInput').click()"
          onmouseover="this.style.borderColor='#ef4444';this.style.background='#fef2f2'"
          onmouseout="this.style.borderColor='#fecaca';this.style.background='#fff'">
          <input type="file" id="retornoDenunciaInput" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="display:none" onchange="_onRetornoDenunciaChange(this)">
          <div id="retornoDenunciaLabel" style="color:#94a3b8;font-size:12px">
            <div style="font-size:24px;margin-bottom:4px">📎</div>
            Haga clic para adjuntar la denuncia de robo<br>
            <span style="font-size:10px;color:#cbd5e1">PDF, JPG, PNG, DOC — máx. 5MB</span>
          </div>
        </div>
      </div>

      <!-- ROBO: Estado fijo BAJA -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Estado CMDB</label>
        <div style="height:38px;font-size:12px;font-weight:700;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;display:flex;align-items:center;padding:0 12px;gap:6px">
          <span style="font-size:14px">⛔</span> BAJA
        </div>
      </div>
      ` : `
      <!-- Almacén destino -->
      <div style="max-width:280px">
        <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Almacén de retorno <span class="required">*</span></label>
        <select id="retornoAlmacen" class="form-control" style="height:38px;font-size:12px">
          <option value="">Seleccionar almacén...</option>
          ${(DB.getConfig('ubicaciones') || []).map(u => '<option value="' + esc(u) + '">' + esc(u) + '</option>').join('')}
        </select>
      </div>

      <!-- Estado CMDB -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Estado CMDB <span class="required">*</span></label>
        <div style="display:flex;gap:8px" id="retornoCmdbBtns">
          <button type="button" class="btn btn-sm" onclick="_retornoSelectCmdb('Disponible')" id="retCmdb_Disponible"
            style="flex:1;padding:10px;border-radius:8px;border:2px solid #e2e8f0;background:#fff;font-weight:600;font-size:12px;cursor:pointer;transition:all .15s">
            <div style="font-size:16px;margin-bottom:2px">✅</div>DISPONIBLE
          </button>
          <button type="button" class="btn btn-sm" onclick="_retornoSelectCmdb('En Mantenimiento')" id="retCmdb_Mantenimiento"
            style="flex:1;padding:10px;border-radius:8px;border:2px solid #e2e8f0;background:#fff;font-weight:600;font-size:12px;cursor:pointer;transition:all .15s">
            <div style="font-size:16px;margin-bottom:2px">🔧</div>MANTENIMIENTO
          </button>
          <button type="button" class="btn btn-sm" onclick="_retornoSelectCmdb('Baja')" id="retCmdb_Baja"
            style="flex:1;padding:10px;border-radius:8px;border:2px solid #e2e8f0;background:#fff;font-weight:600;font-size:12px;cursor:pointer;transition:all .15s">
            <div style="font-size:16px;margin-bottom:2px">⛔</div>BAJA
          </button>
        </div>
      </div>
      `}

      <!-- Estado Equipo (dinámico) -->
      <div id="retornoEstadoEquipoSection" style="display:none">
        <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Estado del Equipo <span class="required">*</span></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap" id="retornoEstadoEquipoBtns"></div>
      </div>

      <!-- Partes afectadas (para REPARACION) -->
      <div id="retornoPartesSection" style="display:none">
        <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Partes afectadas</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${PARTES_EQUIPO.map(p => `
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:#fff"
              onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=this.querySelector('input').checked?'#eff6ff':'#fff'">
              <input type="checkbox" class="retorno-parte" value="${esc(p)}"> ${esc(p)}
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Observaciones -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Observaciones <span class="required">*</span></label>
        <textarea id="retornoObs" class="form-control" rows="3" placeholder="${_esRobo ? 'Describa las circunstancias del robo, lugar, fecha del incidente...' : 'Describa el estado en que se recibe el equipo...'}" style="font-size:12px;resize:vertical"></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal();navigateTo('bitacora','pendientesRetorno')">Cancelar</button>
    <button class="btn ${_esRobo ? 'btn-danger' : 'btn-primary'}" onclick="_ejecutarRetorno()">${_esRobo ? 'Confirmar Baja por Robo' : 'Confirmar Retorno'}</button>
  `, 'modal-lg');

  // Si es robo, auto-seleccionar BAJA como estado CMDB
  if (_esRobo) {
    _retornoCmdb = 'Baja';
    _retornoEstadoEq = 'ROBO';
  }
}

let _retornoCmdb = '';
let _retornoEstadoEq = '';
let _retornoDenunciaFile = null;

const _RETORNO_ESTADOS = {
  'Disponible':       ['NUEVO', 'USADO'],
  'En Mantenimiento': ['GARANTÍA', 'REPARACIÓN'],
  'Baja':             ['DESTRUCCIÓN', 'VENTA', 'DONACIÓN', 'ROBO']
};

function _onRetornoDenunciaChange(input) {
  const file = input.files && input.files[0];
  const label = document.getElementById('retornoDenunciaLabel');
  const wrap = document.getElementById('retornoDenunciaWrap');
  if (!file) {
    _retornoDenunciaFile = null;
    if (label) label.innerHTML = '<div style="font-size:24px;margin-bottom:4px">📎</div>Haga clic para adjuntar la denuncia de robo<br><span style="font-size:10px;color:#cbd5e1">PDF, JPG, PNG, DOC — máx. 5MB</span>';
    if (wrap) { wrap.style.borderColor = '#fecaca'; wrap.style.background = '#fff'; }
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('El archivo excede 5MB', 'error');
    input.value = '';
    _retornoDenunciaFile = null;
    return;
  }
  _retornoDenunciaFile = file;
  if (label) label.innerHTML = '<div style="font-size:24px;margin-bottom:4px">✅</div><strong>' + esc(file.name) + '</strong><br><span style="font-size:10px;color:#10b981">Archivo adjunto correctamente — clic para cambiar</span>';
  if (wrap) { wrap.style.borderColor = '#10b981'; wrap.style.background = '#f0fdf4'; }
}

function _retornoSelectCmdb(val) {
  _retornoCmdb = val;
  _retornoEstadoEq = '';

  // Highlight selected button
  document.querySelectorAll('#retornoCmdbBtns button').forEach(b => {
    b.style.borderColor = '#e2e8f0'; b.style.background = '#fff'; b.style.color = '#334155';
  });
  const colors = { 'Disponible': '#10b981', 'En Mantenimiento': '#f59e0b', 'Baja': '#ef4444' };
  const bg = { 'Disponible': '#f0fdf4', 'En Mantenimiento': '#fffbeb', 'Baja': '#fef2f2' };
  const key = val === 'En Mantenimiento' ? 'Mantenimiento' : val;
  const btn = document.getElementById('retCmdb_' + key);
  if (btn) { btn.style.borderColor = colors[val]; btn.style.background = bg[val]; btn.style.color = colors[val]; }

  // Show estado equipo options
  const section = document.getElementById('retornoEstadoEquipoSection');
  const btnsDiv = document.getElementById('retornoEstadoEquipoBtns');
  section.style.display = '';
  btnsDiv.innerHTML = (_RETORNO_ESTADOS[val] || []).map(e =>
    `<button type="button" class="btn btn-sm retorno-eq-btn" onclick="_retornoSelectEstadoEq('${e}')"
      style="padding:8px 16px;border-radius:8px;border:2px solid #e2e8f0;background:#fff;font-weight:600;font-size:11px;cursor:pointer">${esc(e)}</button>`
  ).join('');

  // Hide partes section
  document.getElementById('retornoPartesSection').style.display = 'none';
}

function _retornoSelectEstadoEq(val) {
  _retornoEstadoEq = val;

  // Highlight
  document.querySelectorAll('.retorno-eq-btn').forEach(b => {
    b.style.borderColor = '#e2e8f0'; b.style.background = '#fff'; b.style.color = '#334155';
  });
  const clicked = [...document.querySelectorAll('.retorno-eq-btn')].find(b => b.textContent.trim() === val);
  if (clicked) { clicked.style.borderColor = '#3b82f6'; clicked.style.background = '#eff6ff'; clicked.style.color = '#1d4ed8'; }

  // Show partes section only for REPARACIÓN
  document.getElementById('retornoPartesSection').style.display = val === 'REPARACIÓN' ? '' : 'none';
}

function _ejecutarRetorno() {
  const _esRoboRet = (_retornoMotivo || '').toUpperCase().includes('REPOSICIÓN ROBO');
  const almacen = _esRoboRet ? '' : ((document.getElementById('retornoAlmacen') || {}).value || '');
  if (!_esRoboRet && !almacen) { showToast('Seleccione el almacén de retorno', 'error'); return; }
  if (!_retornoCmdb) { showToast('Seleccione el estado CMDB', 'error'); return; }
  if (!_retornoEstadoEq) { showToast('Seleccione el estado del equipo', 'error'); return; }
  if (_esRoboRet && !_retornoDenunciaFile) { showToast('Debe adjuntar la denuncia de robo para confirmar la baja', 'error'); return; }
  const obs = (document.getElementById('retornoObs') || {}).value || '';
  if (!obs.trim()) { showToast('Ingrese las observaciones', 'error'); return; }

  const partes = _retornoEstadoEq === 'REPARACIÓN'
    ? [...document.querySelectorAll('.retorno-parte:checked')].map(c => c.value)
    : [];

  const asignaciones = DB.get('asignaciones');
  const activos = DB.get('activos');
  const rec = asignaciones.find(a => a.id === _retornoAsigId);
  if (!rec) return;

  // Marcar asignación como devuelta
  rec.estado = 'Devuelto';
  rec.pendienteRetorno = false;
  rec.fechaCese = today();
  rec.motivoCese = _retornoMotivo === 'REPOSICIÓN ROBO' ? 'REPOSICIÓN ROBO' : _retornoMotivo === 'REPOSICIÓN DAÑO FÍSICO' ? 'REPOSICIÓN DAÑO FÍSICO' : _retornoMotivo === 'REEMPLAZO' ? 'REEMPLAZO' : _retornoMotivo === 'RENOVACIÓN' ? 'RENOVACIÓN' : 'RETORNO POR CESE';
  rec.retornoObs = obs.trim();
  rec.retornoEstadoCmdb = _retornoCmdb;
  rec.retornoEstadoEquipo = _retornoEstadoEq;
  if (partes.length) rec.retornoPartes = partes;
  if (_esRoboRet && _retornoDenunciaFile) {
    rec.denunciaRobo = _retornoDenunciaFile.name;
    rec.denunciaRoboFecha = today();
  }

  // Actualizar activo
  const activo = activos.find(a => a.id === rec.activoId);
  if (activo) {
    activo.estado = _retornoCmdb;
    activo.estadoEquipo = _retornoEstadoEq;
    activo.obsRetorno = obs.trim();
    if (!_esRoboRet) activo.ubicacion = almacen;
    if (partes.length) activo.partesAfectadas = partes.join(', ');
    if (_esRoboRet) activo.motivoBaja = 'ROBO';
    if (_retornoCmdb === 'Disponible' || _retornoCmdb === 'Baja') {
      const otrasVigentes = asignaciones.filter(a => a.activoId === activo.id && a.estado === 'Vigente' && a.id !== rec.id).length;
      if (otrasVigentes === 0) activo.responsable = '';
    }
  }

  DB.set('asignaciones', asignaciones);
  DB.set('activos', activos);
  addMovimiento(_esRoboRet ? 'Baja por Robo' : 'Retorno', _esRoboRet ? `Baja por robo de ${rec.activoCodigo || 'activo'} — Denuncia: ${_retornoDenunciaFile ? _retornoDenunciaFile.name : '—'}` : `Retorno de ${rec.activoCodigo || 'activo'} → ${_retornoCmdb} / ${_retornoEstadoEq}${partes.length ? ' [' + partes.join(', ') + ']' : ''}`);

  // Auto-registrar en bitácora
  if (activo) {
    _autoBitacora({
      movimiento: _esRoboRet ? 'BAJA' : 'INGRESO',
      almacen: _esRoboRet ? 'N/A — ROBO' : (almacen || 'Almacen TI'),
      tipoEquipo: activo.tipo || rec.activoTipo || '',
      equipo: activo.equipo || activo.tipo || '',
      modelo: activo.modelo || rec.activoModelo || '',
      serie: rec.serieAsignada || '',
      inv: activo.codInventario || '',
      correo: rec.correoColab || '',
      motivo: _esRoboRet ? 'REPOSICIÓN ROBO' : (['REEMPLAZO','RENOVACIÓN','RENOVACION','PRÉSTAMO','PRESTAMO','REPOSICIÓN DAÑO FÍSICO','REPOSICIÓN ROBO'].includes((rec.tipoAsignacion || rec.motivo || '').toUpperCase())) ? (rec.tipoAsignacion || rec.motivo) : ''
    });
  }

  closeModal();
  showToast(_esRoboRet ? 'Baja por robo registrada correctamente' : 'Retorno confirmado correctamente');
  navigateTo('bitacora', 'pendientesRetorno');
}

/* ═══════════════════════════════════════════════════════
   BAJAS - BAJAS PENDIENTES
   ═══════════════════════════════════════════════════════ */
let _bajasSeleccionadas = new Set();
let _bajasSearch = '';
let _bajasSearchTimer = null;

function _buildBajasRows() {
  const activos = DB.get('activos');
  const asignaciones = DB.get('asignaciones');
  const rows = [];
  activos.forEach(a => {
    const eUp = (a.estado || '').toUpperCase();
    if (eUp !== 'BAJA' && eUp !== 'DADO DE BAJA') return;
    // Verificar que no esté ya ejecutado (en historial)
    const historial = DB.get('historialBajas');
    const yaEjecutado = historial.some(h => h.activoId === a.id && h.estadoBaja === 'Ejecutada');
    if (yaEjecutado) return;

    // Buscar última asignación para obtener responsable
    const ultimaAsig = asignaciones.filter(x => x.activoId === a.id).sort((x, y) => (y.fechaAsignacion || '').localeCompare(x.fechaAsignacion || ''))[0];

    // Calcular antigüedad
    let antiguedad = '—';
    if (a.fechaCompra) {
      const fc = new Date(a.fechaCompra);
      const hoy = new Date();
      const diffMs = hoy - fc;
      const diffYears = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      const diffMonths = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
      antiguedad = diffYears > 0 ? `${diffYears}a ${diffMonths}m` : `${diffMonths}m`;
    }

    const tieneValor = a.costo && parseFloat(a.costo) > 0;

    (a.series || [{}]).forEach(s => {
      rows.push({
        activoId: a.id,
        codigo: a.codigo || '',
        almacen: a.ubicacion || '',
        tipo: a.tipo || '',
        equipo: a.equipo || a.tipo || '',
        marca: a.marca || '',
        modelo: a.modelo || '',
        serie: s.serie || '',
        codInventario: s.codInventario || '',
        estadoCmdb: a.estado || 'Baja',
        estadoEquipo: a.estadoEquipo || '',
        antiguedad,
        fechaCompra: a.fechaCompra || '',
        costo: a.costo || 0,
        valorizado: tieneValor,
        motivoBaja: a.motivoBaja || a.obsRetorno || '',
        responsable: ultimaAsig ? (ultimaAsig.colaboradorNombre || '') : (a.responsable || ''),
        observaciones: a.obsRetorno || a.observaciones || '',
        origenEquipo: a.origenEquipo || '',
        nDocumento: a.nDocumento || '',
        tipoDocumento: a.tipoDocumento || '',
        sku: a.sku || '',
        fechaIngreso: a.fechaIngreso || '',
        _activo: a
      });
    });
  });
  return rows;
}

function renderBajasPendientes(el) {
  const rows = _buildBajasRows();
  const totalValorizados = rows.filter(r => r.valorizado).length;
  const totalSinValorizar = rows.filter(r => !r.valorizado).length;
  const totalCosto = rows.reduce((s, r) => s + (parseFloat(r.costo) || 0), 0);

  // Filtrar por búsqueda
  let filtered = rows;
  if (_bajasSearch) {
    const s = _bajasSearch.toLowerCase();
    filtered = rows.filter(r =>
      r.codigo.toLowerCase().includes(s) || r.equipo.toLowerCase().includes(s) ||
      r.marca.toLowerCase().includes(s) || r.modelo.toLowerCase().includes(s) ||
      r.serie.toLowerCase().includes(s) || r.almacen.toLowerCase().includes(s) ||
      r.responsable.toLowerCase().includes(s) || r.estadoEquipo.toLowerCase().includes(s)
    );
  }

  // Limpiar selecciones que ya no están en la lista
  const validIds = new Set(rows.map(r => r.activoId + '||' + r.serie));
  _bajasSeleccionadas.forEach(k => { if (!validIds.has(k)) _bajasSeleccionadas.delete(k); });

  const selCount = _bajasSeleccionadas.size;
  const selAptos = [..._bajasSeleccionadas].filter(k => {
    const r = rows.find(x => (x.activoId + '||' + x.serie) === k);
    return r && r.valorizado;
  }).length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Bajas Pendientes</h1>
        <div class="subtitle">Activos registrados para baja, pendientes de ejecución definitiva</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="_exportBajasPendientes()" ${rows.length === 0 ? 'disabled' : ''}>📥 Exportar Reporte</button>
        <button class="btn btn-primary" onclick="openBajaModal()">+ Solicitar Baja</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon" style="background:#fef2f2;color:#dc2626">⛔</div></div>
        <div class="stat-value">${rows.length}</div>
        <div class="stat-label">Total en baja pendiente</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">✅</div></div>
        <div class="stat-value">${totalValorizados}</div>
        <div class="stat-label">Valorizados (aptos)</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon" style="background:#fffbeb;color:#d97706">⚠️</div></div>
        <div class="stat-value">${totalSinValorizar}</div>
        <div class="stat-label">Sin valorizar</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon blue">💰</div></div>
        <div class="stat-value" style="font-size:18px">S/ ${totalCosto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
        <div class="stat-label">Valor total acumulado</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="table-toolbar" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">
      <div class="search-box" style="position:relative;flex:1;max-width:420px">
        <span class="search-icon">🔍</span>
        <input type="text" id="bajasSearchInput" placeholder="Buscar por código, equipo, serie, marca, responsable..."
               value="${esc(_bajasSearch)}" oninput="_onBajasSearch(this.value)">
        <span id="bajasSearchClear" onclick="_bajasSearch='';document.getElementById('bajasSearchInput').value='';resetPage('bajasP');_renderBajasTable()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;color:#94a3b8;font-size:16px;font-weight:700;width:24px;height:24px;display:${_bajasSearch ? 'flex' : 'none'};align-items:center;justify-content:center;border-radius:50%" onmouseover="this.style.background='#fee2e2';this.style.color='#dc2626'" onmouseout="this.style.background='';this.style.color='#94a3b8'" title="Limpiar">✕</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${selCount > 0 ? `
          <span style="font-size:12px;font-weight:600;color:#334155">${selCount} seleccionado(s)</span>
          ${selAptos < selCount ? `<span style="font-size:11px;color:#d97706" title="Algunos ítems no tienen valorización">⚠️ ${selCount - selAptos} sin valorizar</span>` : ''}
          <button class="btn btn-danger" onclick="_ejecutarBajasMasivas()" ${selAptos === 0 ? 'disabled title="Ningún ítem seleccionado tiene valorización"' : ''} style="font-weight:700">
            ⛔ Ejecutar Bajas (${selAptos})
          </button>
        ` : `
          <span style="font-size:12px;color:#94a3b8">Seleccione ítems para ejecutar bajas</span>
        `}
      </div>
    </div>

    <div id="bajasTableWrap"></div>
  `;
  _renderBajasTable();
}

function _onBajasSearch(val) {
  _bajasSearch = val;
  const clearBtn = document.getElementById('bajasSearchClear');
  if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
  resetPage('bajasP');
  clearTimeout(_bajasSearchTimer);
  _bajasSearchTimer = setTimeout(_renderBajasTable, 120);
}

function _renderBajasTable() {
  const wrap = document.getElementById('bajasTableWrap');
  if (!wrap) return;
  const rows = _buildBajasRows();
  let filtered = rows;
  if (_bajasSearch) {
    const s = _bajasSearch.toLowerCase();
    filtered = rows.filter(r =>
      r.codigo.toLowerCase().includes(s) || r.equipo.toLowerCase().includes(s) ||
      r.marca.toLowerCase().includes(s) || r.modelo.toLowerCase().includes(s) ||
      r.serie.toLowerCase().includes(s) || r.almacen.toLowerCase().includes(s) ||
      r.responsable.toLowerCase().includes(s) || r.estadoEquipo.toLowerCase().includes(s)
    );
  }

  const pageItems = pagSlice(filtered, 'bajasP');
  const allPageKeys = pageItems.map(r => r.activoId + '||' + r.serie);
  const allPageSel = pageItems.length > 0 && pageItems.every(r => _bajasSeleccionadas.has(r.activoId + '||' + r.serie));

  const _eqBadge = (eq) => {
    if (!eq) return '<span class="badge badge-neutral" style="font-size:10px">—</span>';
    const u = eq.toUpperCase();
    const cls = u === 'DESTRUCCIÓN' ? 'badge-danger' : u === 'VENTA' ? 'badge-info' : u === 'DONACIÓN' ? 'badge-success' : u === 'ROBO' ? 'badge-danger' : 'badge-warning';
    return '<span class="badge ' + cls + '" style="font-size:10px">' + esc(eq) + '</span>';
  };

  wrap.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th style="width:36px;text-align:center"><input type="checkbox" ${allPageSel ? 'checked' : ''} onchange="_bajasTogglePageAll(this.checked)" title="Seleccionar página"></th>
            <th>Almacén</th>
            <th>Equipo</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Serie</th>
            <th>INV</th>
            <th>Estado CMDB</th>
            <th>Estado Equipo</th>
            <th>Antigüedad</th>
            <th>Valorizado</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0
              ? '<tr><td colspan="12"><div class="empty-state"><div class="empty-icon">📦</div><h3>Sin bajas pendientes</h3><p>No hay activos pendientes de ejecución de baja</p></div></td></tr>'
              : pageItems.map(r => {
                  const key = r.activoId + '||' + r.serie;
                  const isSel = _bajasSeleccionadas.has(key);
                  const canSelect = r.valorizado;
                  const chk = canSelect
                    ? '<input type="checkbox" ' + (isSel ? 'checked' : '') + ' onchange="_bajasToggleItem(\'' + key.replace(/'/g, "\\'") + '\')">'
                    : '<input type="checkbox" disabled title="Sin valorización — no se puede ejecutar" style="opacity:.4;cursor:not-allowed">';
                  const valTd = r.valorizado
                    ? '<span style="color:#10b981;font-weight:700;font-size:12px" title="S/ ' + (parseFloat(r.costo)||0).toFixed(2) + '">SÍ</span>'
                    : '<span style="color:#d97706;font-weight:700;font-size:12px" title="Falta información de costo">NO</span>';
                  return '<tr style="background:' + (isSel ? '#fef2f2' : '') + '">'
                    + '<td style="text-align:center">' + chk + '</td>'
                    + '<td style="font-size:12px">' + esc(r.almacen || '—') + '</td>'
                    + '<td style="font-size:12px;font-weight:600">' + esc(r.equipo) + '</td>'
                    + '<td style="font-size:12px">' + esc(r.marca) + '</td>'
                    + '<td style="font-size:12px">' + esc(r.modelo) + '</td>'
                    + '<td style="font-size:11px;font-family:monospace">' + esc(r.serie || '—') + '</td>'
                    + '<td style="font-size:11px;font-family:monospace">' + esc(r.codInventario || '—') + '</td>'
                    + '<td><span class="badge badge-danger" style="font-size:10px">BAJA</span></td>'
                    + '<td>' + _eqBadge(r.estadoEquipo) + '</td>'
                    + '<td style="font-size:11px;color:#64748b">' + r.antiguedad + '</td>'
                    + '<td style="text-align:center">' + valTd + '</td>'
                    + '<td><div class="action-btns"><button class="btn-icon" title="Ver detalle" onclick="_verDetalleBaja(' + r.activoId + ')" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe">👁️</button></div></td>'
                    + '</tr>';
                }).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">${pagFooter('bajasP', filtered.length)}</div>
    </div>
  `;
}

function _bajasToggleItem(key) {
  if (_bajasSeleccionadas.has(key)) _bajasSeleccionadas.delete(key);
  else _bajasSeleccionadas.add(key);
  renderBajasPendientes(document.getElementById('contentArea'));
}

function _bajasTogglePageAll(checked) {
  const rows = _buildBajasRows();
  let filtered = rows;
  if (_bajasSearch) {
    const s = _bajasSearch.toLowerCase();
    filtered = rows.filter(r =>
      r.codigo.toLowerCase().includes(s) || r.equipo.toLowerCase().includes(s) ||
      r.marca.toLowerCase().includes(s) || r.modelo.toLowerCase().includes(s) ||
      r.serie.toLowerCase().includes(s) || r.almacen.toLowerCase().includes(s) ||
      r.responsable.toLowerCase().includes(s) || r.estadoEquipo.toLowerCase().includes(s)
    );
  }
  const pageItems = pagSlice(filtered, 'bajasP');
  pageItems.forEach(r => {
    if (!r.valorizado) return; // Skip non-valorized
    const key = r.activoId + '||' + r.serie;
    if (checked) _bajasSeleccionadas.add(key);
    else _bajasSeleccionadas.delete(key);
  });
  renderBajasPendientes(document.getElementById('contentArea'));
}

function _verDetalleBaja(activoId) {
  const activos = DB.get('activos');
  const a = activos.find(x => x.id === activoId);
  if (!a) return;
  const asignaciones = DB.get('asignaciones');
  const ultimaAsig = asignaciones.filter(x => x.activoId === a.id).sort((x, y) => (y.fechaAsignacion || '').localeCompare(x.fechaAsignacion || ''))[0];
  const _f = (label, val) => `<div><div style="font-size:10px;color:#64748b;text-transform:uppercase">${label}</div><div style="font-size:13px;font-weight:600">${val || '—'}</div></div>`;

  openModal('Detalle de Activo en Baja', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;background:#fef2f2;padding:14px;border-radius:8px;border:1px solid #fecaca">
        ${_f('Código', esc(a.codigo))}
        ${_f('Tipo', esc(a.tipo))}
        ${_f('Equipo', esc(a.equipo || a.tipo))}
        ${_f('Marca', esc(a.marca))}
        ${_f('Modelo', esc(a.modelo))}
        ${_f('SKU', esc(a.sku))}
        ${_f('Serie', (a.series||[]).map(s=>s.serie).join(', ') || '—')}
        ${_f('INV', (a.series||[]).map(s=>s.codInventario).join(', ') || '—')}
        ${_f('Almacén', esc(a.ubicacion))}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;background:#f8fafc;padding:14px;border-radius:8px">
        ${_f('Estado CMDB', esc(a.estado))}
        ${_f('Estado Equipo', esc(a.estadoEquipo))}
        ${_f('Motivo Baja', esc(a.motivoBaja || a.obsRetorno || ''))}
        ${_f('Fecha Compra', formatDate(a.fechaCompra))}
        ${_f('Fecha Ingreso', formatDate(a.fechaIngreso))}
        ${_f('Costo', a.costo ? 'S/ ' + parseFloat(a.costo).toFixed(2) : '—')}
        ${_f('Origen', esc(a.origenEquipo))}
        ${_f('N° Documento', esc(a.nDocumento))}
        ${_f('Último Responsable', esc(ultimaAsig ? ultimaAsig.colaboradorNombre : a.responsable || ''))}
      </div>
      ${a.obsRetorno ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400e"><strong>Observaciones:</strong> ${esc(a.obsRetorno)}</div>` : ''}
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`, 'modal-lg');
}

function _exportBajasPendientes() {
  const rows = _buildBajasRows();
  if (rows.length === 0) { showToast('No hay datos para exportar', 'error'); return; }

  const asignaciones = DB.get('asignaciones');
  const data = rows.map(r => ({
    'ALMACÉN': r.almacen,
    'EQUIPO': r.equipo,
    'MARCA': r.marca,
    'MODELO': r.modelo,
    'SERIE': r.serie,
    'INV': r.codInventario,
    'CÓDIGO': r.codigo,
    'SKU': r.sku,
    'ESTADO CMDB': r.estadoCmdb,
    'ESTADO EQUIPO': r.estadoEquipo,
    'MOTIVO BAJA': r.motivoBaja,
    'FECHA COMPRA': r.fechaCompra ? formatDate(r.fechaCompra) : '',
    'ANTIGÜEDAD': r.antiguedad,
    'FECHA INGRESO': r.fechaIngreso ? formatDate(r.fechaIngreso) : '',
    'ORIGEN': r.origenEquipo,
    'N° DOCUMENTO': r.nDocumento,
    'TIPO DOCUMENTO': r.tipoDocumento,
    'COSTO (S/)': parseFloat(r.costo) || 0,
    'VALORIZADO': r.valorizado ? 'SÍ' : 'NO',
    'ÚLTIMO RESPONSABLE': r.responsable,
    'UBICACIÓN': r.almacen,
    'OBSERVACIONES': r.observaciones
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bajas Pendientes');
  XLSX.writeFile(wb, 'Bajas_Pendientes_' + today().replace(/-/g, '') + '.xlsx');
  showToast('Reporte exportado correctamente');
}

function _ejecutarBajasMasivas() {
  const rows = _buildBajasRows();
  const selRows = rows.filter(r => _bajasSeleccionadas.has(r.activoId + '||' + r.serie) && r.valorizado);
  if (selRows.length === 0) { showToast('No hay ítems válidos seleccionados', 'error'); return; }

  const seriesResumen = selRows.map(r => r.serie || r.codigo).join(', ');

  openModal('Ejecutar Bajas — Guía de Salida', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;font-size:12px;color:#991b1b;display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">⛔</span>
        <span>Se ejecutará la baja definitiva de <strong>${selRows.length} equipo(s)</strong>. Esta acción es irreversible. Debe adjuntar la guía de salida para completar el proceso.</span>
      </div>

      <!-- Resumen -->
      <div style="background:#f8fafc;border-radius:8px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px">Resumen de equipos</div>
        <div style="font-size:11px;color:#64748b;max-height:80px;overflow-y:auto;line-height:1.6">${selRows.map(r => '<span style="display:inline-block;background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:2px 8px;margin:2px;font-family:monospace;font-size:10px">' + esc(r.codigo) + ' — ' + esc(r.serie || '—') + '</span>').join('')}</div>
        <div style="font-size:12px;font-weight:700;color:#334155;margin-top:8px">Total: ${selRows.length} equipo(s) | Valor: S/ ${selRows.reduce((s, r) => s + (parseFloat(r.costo) || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
      </div>

      <!-- Fecha de salida -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Fecha de salida <span class="required">*</span></label>
          <input type="date" class="form-control" id="bajaSalidaFecha" value="${today()}" style="height:38px;font-size:12px">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Número de guía <span class="required">*</span></label>
          <input class="form-control" id="bajaSalidaGuia" placeholder="GS-000000" style="height:38px;font-size:12px">
        </div>
      </div>

      <!-- Guía de salida (obligatoria) -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:6px;display:block">📎 Guía de salida (archivo adjunto) <span class="required">*</span></label>
        <div id="bajaGuiaWrap" style="border:2px dashed #fecaca;border-radius:8px;padding:16px;text-align:center;background:#fff;cursor:pointer;transition:all .15s"
          onclick="document.getElementById('bajaGuiaInput').click()"
          onmouseover="this.style.borderColor='#ef4444';this.style.background='#fef2f2'"
          onmouseout="this.style.borderColor='#fecaca';this.style.background='#fff'">
          <input type="file" id="bajaGuiaInput" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" style="display:none" onchange="_onBajaGuiaChange(this)">
          <div id="bajaGuiaLabel" style="color:#94a3b8;font-size:12px">
            <div style="font-size:24px;margin-bottom:4px">📎</div>
            Haga clic para adjuntar la guía de salida<br>
            <span style="font-size:10px;color:#cbd5e1">PDF, JPG, PNG, DOC, XLSX — máx. 10MB</span>
          </div>
        </div>
      </div>

      <!-- Observaciones -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Observaciones</label>
        <textarea id="bajaSalidaObs" class="form-control" rows="2" placeholder="Observaciones adicionales..." style="font-size:12px;resize:vertical"></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="_confirmarEjecucionBajas()" style="font-weight:700">⛔ Confirmar Ejecución de Bajas</button>
  `, 'modal-lg');

  window._bajaPendGuiaFile = null;
}

function _onBajaGuiaChange(input) {
  const file = input.files && input.files[0];
  const label = document.getElementById('bajaGuiaLabel');
  const wrap = document.getElementById('bajaGuiaWrap');
  if (!file) {
    window._bajaPendGuiaFile = null;
    if (label) label.innerHTML = '<div style="font-size:24px;margin-bottom:4px">📎</div>Haga clic para adjuntar la guía de salida<br><span style="font-size:10px;color:#cbd5e1">PDF, JPG, PNG, DOC, XLSX — máx. 10MB</span>';
    if (wrap) { wrap.style.borderColor = '#fecaca'; wrap.style.background = '#fff'; }
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('El archivo excede 10MB', 'error');
    input.value = '';
    window._bajaPendGuiaFile = null;
    return;
  }
  window._bajaPendGuiaFile = file;
  if (label) label.innerHTML = '<div style="font-size:24px;margin-bottom:4px">✅</div><strong>' + esc(file.name) + '</strong><br><span style="font-size:10px;color:#10b981">Archivo adjunto correctamente — clic para cambiar</span>';
  if (wrap) { wrap.style.borderColor = '#10b981'; wrap.style.background = '#f0fdf4'; }
}

function _confirmarEjecucionBajas() {
  const fechaSalida = (document.getElementById('bajaSalidaFecha') || {}).value || '';
  const numGuia = ((document.getElementById('bajaSalidaGuia') || {}).value || '').trim();
  const obs = ((document.getElementById('bajaSalidaObs') || {}).value || '').trim();

  if (!fechaSalida) { showToast('Ingrese la fecha de salida', 'error'); return; }
  if (!numGuia) { showToast('Ingrese el número de guía', 'error'); return; }
  if (!window._bajaPendGuiaFile) { showToast('Debe adjuntar la guía de salida para ejecutar las bajas', 'error'); return; }

  if (!confirm('¿Está seguro de ejecutar la baja definitiva de los equipos seleccionados? Esta acción es irreversible.')) return;

  const rows = _buildBajasRows();
  const selRows = rows.filter(r => _bajasSeleccionadas.has(r.activoId + '||' + r.serie) && r.valorizado);
  if (selRows.length === 0) { showToast('No hay ítems válidos', 'error'); return; }

  const activos = DB.get('activos');
  const historial = DB.get('historialBajas');

  selRows.forEach(r => {
    const activo = activos.find(a => a.id === r.activoId);
    if (activo) {
      activo.estado = 'Dado de Baja';
      activo.fechaBajaEjecutada = fechaSalida;
      activo.guiaSalida = numGuia;
      activo.guiaSalidaArchivo = window._bajaPendGuiaFile ? window._bajaPendGuiaFile.name : '';
    }

    historial.unshift({
      id: nextId(historial),
      activoId: r.activoId,
      activoCodigo: r.codigo,
      activoTipo: r.equipo,
      marca: r.marca,
      modelo: r.modelo,
      serie: r.serie,
      codInventario: r.codInventario,
      almacen: r.almacen,
      estadoEquipo: r.estadoEquipo,
      motivoBaja: r.motivoBaja,
      costo: r.costo,
      fechaCompra: r.fechaCompra,
      antiguedad: r.antiguedad,
      responsable: r.responsable,
      observaciones: r.observaciones || obs,
      fechaSalida: fechaSalida,
      numGuia: numGuia,
      guiaArchivo: window._bajaPendGuiaFile ? window._bajaPendGuiaFile.name : '',
      estadoBaja: 'Ejecutada',
      fechaAprobacion: today(),
      solicitante: currentUser ? currentUser.nombre : 'Sistema'
    });

    // Bitácora BAJA
    _autoBitacora({
      movimiento: 'BAJA',
      almacen: r.almacen || '',
      tipoEquipo: r.tipo || '',
      equipo: r.equipo || '',
      modelo: r.modelo || '',
      serie: r.serie || '',
      inv: r.codInventario || '',
      motivo: 'BAJA EJECUTADA'
    });
  });

  DB.set('activos', activos);
  DB.set('historialBajas', historial);

  // Limpiar bajasPendientes legacy que coincidan
  const bajasPend = DB.get('bajasPendientes');
  const ejectedIds = new Set(selRows.map(r => r.activoId));
  DB.set('bajasPendientes', bajasPend.filter(b => !ejectedIds.has(b.activoId)));

  addMovimiento('Ejecución de Bajas', `${selRows.length} equipo(s) dados de baja definitiva — Guía: ${numGuia}`);

  _bajasSeleccionadas.clear();
  window._bajaPendGuiaFile = null;
  closeModal();
  showToast(`${selRows.length} equipo(s) dados de baja definitiva correctamente`);
  renderBajasPendientes(document.getElementById('contentArea'));
}

function openBajaModal() {
  const activos = DB.get('activos').filter(a => {
    const e = (a.estado||'').toUpperCase();
    return e !== 'DADO DE BAJA' && e !== 'BAJA';
  });
  const motivos = ['DESTRUCCIÓN', 'VENTA', 'DONACIÓN', 'OBSOLETO', 'DAÑADO IRREPARABLE', 'PÉRDIDA', 'ROBO', 'FIN DE VIDA ÚTIL', 'OTRO'];

  openModal('Solicitar Baja de Activo', `
    <div class="form-grid">
      <div class="form-group full">
        <label>Activo <span class="required">*</span></label>
        <select class="form-control" id="fBajaActivo">
          <option value="">Seleccionar activo...</option>
          ${activos.map(a => `<option value="${a.id}">${esc(a.codigo)} - ${esc(a.tipo)} ${esc(a.marca)} ${esc(a.modelo)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Motivo <span class="required">*</span></label>
        <select class="form-control" id="fBajaMotivo"><option value="">Seleccionar...</option>${motivos.map(m => '<option value="' + esc(m) + '">' + esc(m) + '</option>').join('')}</select>
      </div>
      <div class="form-group">
        <label>Fecha</label>
        <input type="date" class="form-control" id="fBajaFecha" value="${today()}">
      </div>
      <div class="form-group full">
        <label>Observaciones</label>
        <textarea class="form-control" id="fBajaObs" rows="2"></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="saveBaja()">Solicitar Baja</button>
  `);
}

function saveBaja() {
  const activoId = parseInt(document.getElementById('fBajaActivo').value);
  const motivo = document.getElementById('fBajaMotivo').value;
  const fecha = document.getElementById('fBajaFecha').value;
  const obs = document.getElementById('fBajaObs').value.trim();

  if (!activoId || !motivo) {
    showToast('Seleccione activo y motivo', 'error');
    return;
  }

  const activos = DB.get('activos');
  const activo = activos.find(a => a.id === activoId);
  if (!activo) return;

  // Marcar activo como Baja (pendiente)
  activo.estado = 'Baja';
  activo.estadoEquipo = motivo;
  activo.motivoBaja = motivo;
  activo.obsRetorno = obs;
  DB.set('activos', activos);

  const bajas = DB.get('bajasPendientes');
  bajas.push(upperFields({
    id: nextId(bajas),
    activoId: activo.id, activoCodigo: activo.codigo,
    activoTipo: `${activo.tipo} ${activo.marca}`,
    motivo, fecha: fecha || today(),
    solicitante: currentUser ? currentUser.nombre : 'Sistema', observaciones: obs
  }));
  DB.set('bajasPendientes', bajas);
  addMovimiento('Solicitud Baja', `Baja solicitada para ${activo.codigo}: ${motivo}`);

  _autoBitacora({
    movimiento: 'SALIDA',
    almacen: (activo.ubicacion || 'Almacen TI'),
    tipoEquipo: activo.tipo || '',
    equipo: activo.equipo || activo.tipo || '',
    modelo: activo.modelo || '',
    serie: (activo.series && activo.series[0]) ? activo.series[0].serie || '' : '',
    inv: activo.codInventario || '',
    motivo: 'BAJA'
  });

  closeModal();
  showToast('Solicitud de baja registrada');
  renderBajasPendientes(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   BAJAS - HISTORIAL
   ═══════════════════════════════════════════════════════ */
function renderHistorialBajas(el) {
  const historial = DB.get('historialBajas');

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Historial de Bajas</h1>
        <div class="subtitle">Registro histórico de bajas aprobadas y rechazadas</div>
      </div>
    </div>
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead><tr><th>ID</th><th>Activo</th><th>Tipo</th><th>Motivo</th><th>Solicitante</th><th>F. Solicitud</th><th>F. Resolución</th><th>Estado</th></tr></thead>
          <tbody>
            ${historial.length === 0
              ? '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📂</div><h3>Sin historial</h3><p>No hay registros de bajas</p></div></td></tr>'
              : pagSlice(historial, 'histBajas').map(b => `
                  <tr>
                    <td>${b.id}</td>
                    <td><strong>${esc(b.activoCodigo)}</strong></td>
                    <td>${esc(b.activoTipo)}</td>
                    <td>${esc(b.motivo)}</td>
                    <td>${esc(b.solicitante)}</td>
                    <td>${formatDate(b.fecha)}</td>
                    <td>${formatDate(b.fechaAprobacion)}</td>
                    <td>
                      <span class="badge ${b.estadoBaja === 'Aprobada' ? 'badge-success' : 'badge-danger'}">
                        <span class="badge-dot"></span>${esc(b.estadoBaja)}
                      </span>
                    </td>
                  </tr>
                `).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">${pagFooter('histBajas', historial.length)}</div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   CONFIGURACION - GESTORES
   ═══════════════════════════════════════════════════════ */
function renderGestores(el) {
  const gestores = DB.get('gestores');
  const totalAdmin = gestores.filter(g => g.perfil === 'Administrativo').length;
  const totalTiendas = gestores.filter(g => g.perfil === 'Tiendas').length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Gestores del Sistema</h1>
        <div class="subtitle">Administración de usuarios gestores de activos TI</div>
      </div>
      <button class="btn btn-primary" onclick="openGestorModal()">+ Nuevo Gestor</button>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon blue">👥</div></div>
        <div class="stat-value">${gestores.length}</div>
        <div class="stat-label">Total gestores</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">✅</div></div>
        <div class="stat-value">${gestores.filter(g => g.estado === 'Activo').length}</div>
        <div class="stat-label">Activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon purple">🏢</div></div>
        <div class="stat-value">${totalAdmin}</div>
        <div class="stat-label">Perfil Administrativo</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon orange">🏪</div></div>
        <div class="stat-value">${totalTiendas}</div>
        <div class="stat-label">Perfil Tiendas</div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Usuario</th><th>Rol</th><th>Perfil</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            ${gestores.length === 0
              ? '<tr><td colspan="8"><div class="empty-state"><p>No hay gestores registrados</p></div></td></tr>'
              : pagSlice(gestores, 'gestores').map(g => `
              <tr>
                <td>${g.id}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${g.perfil === 'Tiendas' ? '#f59e0b,#ef4444' : '#3b82f6,#6366f1'});display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">
                      ${esc(g.nombre.split(' ').map(p => p[0]).slice(0, 2).join(''))}
                    </div>
                    <strong>${esc(g.nombre)}</strong>
                  </div>
                </td>
                <td style="font-size:12px">${esc(g.email)}</td>
                <td><code style="background:var(--bg);padding:2px 8px;border-radius:4px;font-size:12px">${esc(g.usuario || '—')}</code></td>
                <td><span class="badge ${g.rol === 'Administrador' ? 'badge-purple' : 'badge-info'}">${esc(g.rol)}</span></td>
                <td>
                  <span class="badge ${g.perfil === 'Tiendas' ? 'badge-warning' : 'badge-info'}" style="font-size:10px">
                    ${g.perfil === 'Tiendas' ? '🏪' : '🏢'} ${esc(g.perfil || '—')}
                  </span>
                </td>
                <td>
                  <span class="badge ${g.estado === 'Activo' ? 'badge-success' : 'badge-danger'}">
                    <span class="badge-dot"></span>${esc(g.estado)}
                  </span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon" title="Editar" onclick="openGestorModal(${g.id})">✏️</button>
                    <button class="btn-icon" title="Cambiar contraseña" onclick="openCambiarPassModal(${g.id})">🔑</button>
                    <button class="btn-icon" title="Eliminar" onclick="deleteGestor(${g.id})">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="table-footer">${pagFooter('gestores', gestores.length)}</div>
    </div>
  `;
}

function openGestorModal(id) {
  const gestores = DB.get('gestores');
  const g = id ? gestores.find(x => x.id === id) : null;

  openModal(g ? 'Editar Gestor' : 'Registrar Nuevo Gestor', `
    <div class="form-grid">
      <div class="form-group full" style="margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:1px solid var(--border)">Datos Personales</div>
      </div>
      <div class="form-group">
        <label>Nombre Completo <span class="required">*</span></label>
        <div class="input-icon-wrap">
          <span class="iw-icon">👤</span>
          <input class="form-control" id="fGNombre" placeholder="Nombre del gestor" value="${esc(g?.nombre || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Email <span class="required">*</span></label>
        <div class="input-icon-wrap">
          <span class="iw-icon">✉️</span>
          <input class="form-control" id="fGEmail" type="email" placeholder="correo@empresa.com" value="${esc(g?.email || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Rol</label>
        <select class="form-control" id="fGRol">
          <option value="Gestor" ${g?.rol === 'Gestor' ? 'selected' : ''}>Gestor</option>
          <option value="Administrador" ${g?.rol === 'Administrador' ? 'selected' : ''}>Administrador</option>
        </select>
      </div>
      <div class="form-group">
        <label>Perfil de Gestión <span class="required">*</span></label>
        <select class="form-control" id="fGPerfil">
          <option value="">Seleccionar perfil...</option>
          <option value="Administrativo" ${g?.perfil === 'Administrativo' ? 'selected' : ''}>🏢 Administrativo — Asigna equipos a colaboradores</option>
          <option value="Tiendas" ${g?.perfil === 'Tiendas' ? 'selected' : ''}>🏪 Tiendas — Gestiona activos en tiendas/locales</option>
        </select>
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select class="form-control" id="fGEstado">
          <option value="Activo" ${g?.estado === 'Activo' || !g ? 'selected' : ''}>Activo</option>
          <option value="Inactivo" ${g?.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>

      <div class="form-group full" style="margin-bottom:8px;margin-top:8px">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:1px solid var(--border)">Credenciales de Acceso</div>
      </div>
      <div class="form-group">
        <label>Usuario <span class="required">*</span></label>
        <div class="input-icon-wrap">
          <span class="iw-icon">🔑</span>
          <input class="form-control" id="fGUsuario" placeholder="Nombre de usuario" value="${esc(g?.usuario || '')}" ${g ? 'readonly style="background:#f1f5f9;cursor:not-allowed"' : ''}>
        </div>
        ${g ? '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">El usuario no se puede cambiar. Use 🔑 para cambiar contraseña.</div>' : ''}
      </div>
      ${!g ? `
      <div class="form-group">
        <label>Contraseña <span class="required">*</span></label>
        <div class="input-icon-wrap">
          <span class="iw-icon">🔒</span>
          <input class="form-control" id="fGPassword" type="password" placeholder="Mínimo 6 caracteres">
        </div>
      </div>
      <div class="form-group">
        <label>Confirmar Contraseña <span class="required">*</span></label>
        <div class="input-icon-wrap">
          <span class="iw-icon">🔒</span>
          <input class="form-control" id="fGPassword2" type="password" placeholder="Repita la contraseña">
        </div>
      </div>
      ` : ''}
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveGestor(${id || 'null'})">${g ? 'Guardar Cambios' : 'Registrar Gestor'}</button>
  `, 'modal-lg');
}

function saveGestor(id) {
  const nombre  = document.getElementById('fGNombre').value.trim();
  const email   = document.getElementById('fGEmail').value.trim();
  const rol     = document.getElementById('fGRol').value;
  const perfil  = document.getElementById('fGPerfil').value;
  const estado  = document.getElementById('fGEstado').value;
  const usuario = document.getElementById('fGUsuario').value.trim();

  if (!nombre || !email || !perfil || !usuario) {
    showToast('Complete todos los campos obligatorios', 'error');
    return;
  }

  const gestores = DB.get('gestores');

  if (id) {
    const idx = gestores.findIndex(g => g.id === id);
    if (idx >= 0) {
      gestores[idx] = { ...gestores[idx], nombre, email, rol, perfil, estado };
      addMovimiento('Edición Gestor', `Gestor ${nombre} actualizado (Perfil: ${perfil})`);
    }
  } else {
    const pass1 = document.getElementById('fGPassword').value;
    const pass2 = document.getElementById('fGPassword2').value;

    if (!pass1 || pass1.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    if (pass1 !== pass2) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }
    if (gestores.some(g => g.usuario === usuario)) {
      showToast('El nombre de usuario ya existe', 'error');
      return;
    }

    gestores.push(upperFields({ id: nextId(gestores), nombre, email, rol, perfil, usuario, password: pass1, estado }));
    addMovimiento('Nuevo Gestor', `Gestor ${nombre} registrado (Perfil: ${perfil}, Usuario: ${usuario})`);
  }
  DB.set('gestores', gestores);
  closeModal();
  showToast(id ? 'Gestor actualizado' : 'Gestor registrado correctamente');
  renderGestores(document.getElementById('contentArea'));
}

function openCambiarPassModal(id) {
  const gestores = DB.get('gestores');
  const g = gestores.find(x => x.id === id);
  if (!g) return;

  openModal(`Cambiar Contraseña — ${esc(g.nombre)}`, `
    <div style="max-width:400px;margin:0 auto">
      <div style="text-align:center;margin-bottom:20px">
        <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;margin:0 auto 10px">🔑</div>
        <div style="font-size:13px;color:var(--text-secondary)">Usuario: <strong>${esc(g.usuario)}</strong></div>
      </div>
      <div class="form-group" style="margin-bottom:14px">
        <label>Nueva Contraseña <span class="required">*</span></label>
        <input class="form-control" id="fNewPass" type="password" placeholder="Mínimo 6 caracteres">
      </div>
      <div class="form-group">
        <label>Confirmar Nueva Contraseña <span class="required">*</span></label>
        <input class="form-control" id="fNewPass2" type="password" placeholder="Repita la contraseña">
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveCambiarPass(${id})">Cambiar Contraseña</button>
  `);
}

function saveCambiarPass(id) {
  const pass1 = document.getElementById('fNewPass').value;
  const pass2 = document.getElementById('fNewPass2').value;

  if (!pass1 || pass1.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }
  if (pass1 !== pass2) {
    showToast('Las contraseñas no coinciden', 'error');
    return;
  }

  const gestores = DB.get('gestores');
  const idx = gestores.findIndex(g => g.id === id);
  if (idx >= 0) {
    gestores[idx].password = pass1;
    DB.set('gestores', gestores);
    addMovimiento('Cambio Contraseña', `Contraseña cambiada para ${gestores[idx].nombre}`);
    closeModal();
    showToast('Contraseña actualizada correctamente');
  }
}

function deleteGestor(id) {
  if (currentUser && currentUser.id === id) {
    showToast('No puede eliminar su propia cuenta', 'error');
    return;
  }
  if (!confirm('¿Eliminar este gestor?')) return;
  const gestores = DB.get('gestores');
  const g = gestores.find(x => x.id === id);
  DB.set('gestores', gestores.filter(x => x.id !== id));
  if (g) addMovimiento('Eliminación Gestor', `Gestor ${g.nombre} eliminado`);
  showToast('Gestor eliminado');
  renderGestores(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   CONFIGURACION - PARAMETROS
   ═══════════════════════════════════════════════════════ */
let paramTab = 'tipos';
let paramTipoSelected = null;

const PARAM_TABS = [
  { key: 'tipos',         label: 'Tipo de Equipos', hier: true },
  { key: 'marcas',        label: 'Marcas' },
  { key: 'gamas',         label: 'Gamas' },
  { key: 'estados',       label: 'Estado CMDB' },
  { key: 'estadosEquipo', label: 'Estado Equipo' },
  { key: 'origenes',      label: 'Orígenes' },
  { key: 'tipoDocumento', label: 'Tipo Documento' },
  { key: 'sistemasOS',    label: 'Sistemas OS' },
  { key: 'opcionesRAM',   label: 'RAM' },
  { key: 'opcionesAlmacenamiento', label: 'Almacenamiento' },
  { key: 'ubicaciones',   label: 'Almacenes' },
  { key: 'areas',         label: 'Áreas' },
  { key: 'regiones',      label: 'Regiones' },
  { key: 'departamentos', label: 'Departamentos' },
  { key: 'tiposLocal',    label: 'Tipos de Local' },
  { key: 'sedesAdmin',    label: 'Sedes Administrativas' },
  { key: 'tipoPuesto',    label: 'Tipo de Puesto', perfil: 'Administrativo' },
  { key: 'tipoAsignacion', label: 'Tipo Asignación' }
];

function renderParametros(el) {
  const perfil = currentUser ? currentUser.perfil : '';
  const isAdmin = currentUser && currentUser.rol === 'Administrador';
  const visibleTabs = PARAM_TABS.filter(t => !t.perfil || isAdmin || t.perfil === perfil);
  const activeTab = visibleTabs.find(t => t.key === paramTab) || visibleTabs[0];

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Parámetros del Sistema</h1>
        <div class="subtitle">Configuración de valores maestros</div>
      </div>
    </div>

    <div class="param-tabs">
      ${visibleTabs.map(t => `
        <button class="param-tab ${t.key === paramTab ? 'active' : ''}"
                onclick="paramTab='${t.key}';renderParametros(document.getElementById('contentArea'))">
          ${t.label}
        </button>
      `).join('')}
    </div>

    <div class="param-tab-content">
      ${activeTab.hier ? _renderTipoEquiposTab() : _renderFlatParamTab(activeTab.key, activeTab.label)}
    </div>

    <div style="margin-top:32px">
      <div class="card">
        <div class="card-header"><h3>⚠️ Zona de Peligro</h3></div>
        <div class="card-body" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--danger)">Resetear datos operativos</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">Eliminar equipos, colaboradores, asignaciones, CMDB, movimientos y bajas</div>
          </div>
          <button class="btn btn-danger" onclick="resetAllData()">Resetear Todo</button>
        </div>
      </div>
    </div>
  `;
}

function _renderTipoEquiposTab() {
  const tipos      = DB.getConfig('tipos', []);
  const tipoEquipos = DB.getConfig('tipoEquipos', {});
  const sel        = paramTipoSelected;
  const equipos    = sel ? (tipoEquipos[sel] || []) : [];

  const tipoRows = tipos.length === 0
    ? '<p style="color:var(--text-muted);font-size:13px;padding:16px 10px">Sin tipos configurados</p>'
    : tipos.map((tipo, idx) => {
        const safeT = tipo.replace(/'/g, "\\'");
        return `
          <div class="tipo-item ${sel === tipo ? 'selected' : ''}"
               onclick="paramTipoSelected='${safeT}';renderParametros(document.getElementById('contentArea'))">
            <span>${esc(tipo)}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="tipo-item-count">${(tipoEquipos[tipo] || []).length}</span>
              <button class="btn-icon" style="width:22px;height:22px;border:none;font-size:11px;flex-shrink:0"
                      onclick="event.stopPropagation();removeTipoEquipo(${idx})" title="Eliminar tipo">✕</button>
            </div>
          </div>`;
      }).join('');

  const safeS = sel ? sel.replace(/'/g, "\\'") : '';

  const equipoBody = !sel
    ? '<div class="equipo-panel-empty">← Selecciona un tipo para ver y agregar sus equipos</div>'
    : equipos.length === 0
      ? '<div class="equipo-panel-empty">Sin equipos configurados.<br>Haz clic en <strong>+ Equipo</strong> para agregar.</div>'
      : `<div class="equipo-list">
          ${equipos.map((eq, idx) => `
            <div class="equipo-item">
              <span>${esc(eq)}</span>
              <button class="btn-icon" style="width:28px;height:28px;border:none"
                      onclick="removeEquipoFromTipo('${safeS}',${idx})" title="Eliminar">✕</button>
            </div>
          `).join('')}
        </div>`;

  return `
    <div class="tipo-equipo-layout">
      <div class="tipo-panel">
        <div class="tipo-panel-header">
          <h4>Tipos (${tipos.length})</h4>
          <button class="btn btn-sm btn-primary" onclick="addTipoEquipo()">+ Tipo</button>
        </div>
        <div class="tipo-list">${tipoRows}</div>
      </div>
      <div class="equipo-panel">
        <div class="equipo-panel-header">
          <h4>${sel ? `Equipos en <em style="font-style:normal;color:var(--primary)">${esc(sel)}</em>` : 'Selecciona un tipo'}</h4>
          ${sel ? `<button class="btn btn-sm btn-primary" onclick="addEquipoToTipo('${safeS}')">+ Equipo</button>` : ''}
        </div>
        ${equipoBody}
      </div>
    </div>
  `;
}

function _renderFlatParamTab(key, label) {
  const items = DB.getConfig(key, []);
  return `
    <div class="card">
      <div class="card-header">
        <h3>${label}</h3>
        <button class="btn btn-sm btn-primary" onclick="addParamItem('${key}','${label}')">+ Agregar</button>
      </div>
      <div class="card-body">
        ${items.length === 0
          ? '<p style="color:var(--text-muted);font-size:13px">Sin elementos configurados</p>'
          : `<div style="display:flex;flex-direction:column;gap:6px">
              ${items.map((item, idx) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:6px">
                  <span style="font-size:13px">${esc(item)}</span>
                  <button class="btn-icon" style="width:28px;height:28px;border:none"
                          onclick="removeParamItem('${key}',${idx})" title="Eliminar">✕</button>
                </div>
              `).join('')}
            </div>`
        }
      </div>
    </div>
  `;
}

/* --- Tipos jerárquicos --- */
function addTipoEquipo() {
  const val = prompt('Nombre del Tipo de Equipo (ej: LAPTOP, PC, MONITOR):');
  if (!val || !val.trim()) return;
  const tipos = DB.getConfig('tipos', []);
  if (tipos.some(t => t.toLowerCase() === val.trim().toLowerCase())) {
    showToast('El tipo ya existe', 'error'); return;
  }
  tipos.push(val.trim());
  DB.setConfig('tipos', tipos);
  paramTipoSelected = val.trim(); // auto-seleccionar el nuevo tipo
  showToast('Tipo agregado — ahora puedes agregar equipos');
  renderParametros(document.getElementById('contentArea'));
}

function removeTipoEquipo(idx) {
  if (!confirm('¿Eliminar este tipo? También se eliminarán sus equipos configurados.')) return;
  const tipos = DB.getConfig('tipos', []);
  const tipoEquipos = DB.getConfig('tipoEquipos', {});
  const removed = tipos[idx];
  tipos.splice(idx, 1);
  delete tipoEquipos[removed];
  DB.setConfig('tipos', tipos);
  DB.setConfig('tipoEquipos', tipoEquipos);
  if (paramTipoSelected === removed) paramTipoSelected = null;
  showToast('Tipo eliminado');
  renderParametros(document.getElementById('contentArea'));
}

function addEquipoToTipo(tipo) {
  const val = prompt(`Agregar equipo en "${tipo}" (ej: LAPTOP MINI):`);
  if (!val || !val.trim()) return;
  const tipoEquipos = DB.getConfig('tipoEquipos', {});
  if (!tipoEquipos[tipo]) tipoEquipos[tipo] = [];
  if (tipoEquipos[tipo].some(e => e.toLowerCase() === val.trim().toLowerCase())) {
    showToast('El equipo ya existe en este tipo', 'error'); return;
  }
  tipoEquipos[tipo].push(val.trim());
  DB.setConfig('tipoEquipos', tipoEquipos);
  showToast('Equipo agregado');
  renderParametros(document.getElementById('contentArea'));
}

function removeEquipoFromTipo(tipo, idx) {
  if (!confirm('¿Eliminar este equipo?')) return;
  const tipoEquipos = DB.getConfig('tipoEquipos', {});
  if (!tipoEquipos[tipo]) return;
  tipoEquipos[tipo].splice(idx, 1);
  DB.setConfig('tipoEquipos', tipoEquipos);
  showToast('Equipo eliminado');
  renderParametros(document.getElementById('contentArea'));
}

/* --- Lista plana --- */
function addParamItem(key, label) {
  const val = prompt(`Agregar nuevo valor a "${label}":`);
  if (!val || !val.trim()) return;
  const items = DB.getConfig(key, []);
  if (items.some(i => i.toLowerCase() === val.trim().toLowerCase())) {
    showToast('El valor ya existe', 'error'); return;
  }
  items.push(val.trim());
  DB.setConfig(key, items);
  showToast('Valor agregado');
  renderParametros(document.getElementById('contentArea'));
}

function removeParamItem(key, idx) {
  const items = DB.getConfig(key, []);
  const val = items[idx];
  // Validar que el almacén no tenga equipos asignados
  if (key === 'ubicaciones') {
    const activos = DB.get('activos');
    const enUso = activos.filter(a => (a.ubicacion || '').toUpperCase() === (val || '').toUpperCase());
    if (enUso.length > 0) {
      showToast(`No se puede eliminar "${val}" porque tiene ${enUso.length} equipo(s) registrado(s)`, 'error');
      return;
    }
  }
  if (!confirm('¿Eliminar este valor?')) return;
  items.splice(idx, 1);
  DB.setConfig(key, items);
  showToast('Valor eliminado');
  renderParametros(document.getElementById('contentArea'));
}

function resetAllData() {
  if (!confirm('¿ESTÁ SEGURO? Se eliminarán los datos de equipos, colaboradores, asignaciones, CMDB, movimientos y bajas.')) return;
  if (!confirm('Esta acción es irreversible. ¿Continuar?')) return;

  // Solo resetear datos operativos (no configuración, usuarios, sesión, etc.)
  const keysToReset = [
    'activos',
    'colaboradores',
    'asignaciones',
    'movimientos',
    'bajasPendientes',
    'historialBajas',
    'bitacoraMovimientos',
    'bitacoraArchivos'
  ];
  keysToReset.forEach(k => localStorage.removeItem('ati_' + k));

  showToast('Datos operativos eliminados correctamente.', 'info');
  setTimeout(() => renderPage(), 500);
}

/* ═══════════════════════════════════════════════════════
   APP INITIALIZATION
   ═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  const hasSession = checkSession();
  if (hasSession) {
    restoreSidebarState();
    buildSidebar();
    updateBreadcrumb();
    renderPage();
  }
});
