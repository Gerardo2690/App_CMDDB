/* ═══════════════════════════════════════════════════════
   DATA LAYER - IndexedDB con caché en memoria
   Soporta cientos de MB (20K+ activos, 3K+ colaboradores)
   API síncrona compatible: DB.get(), DB.set(), DB.getConfig(), DB.setConfig()
   ═══════════════════════════════════════════════════════ */
// #19: Campos que NO se normalizan a UPPERCASE
const _DB_SKIP_NORMALIZE = ['email','password','usuario','correoColab','correoSupervisor','correoResponsable','emailResponsable',
  'fechaIngreso','fechaCompra','fechaAsignacion','fechaCese','fechaApertura','adendaFechaInicio','adendaFechaFin',
  'fecha','fechaAprobacion','estado','estadoSerie','fechaRetorno','fechaFinPrestamo','fechaBajaEjecutada',
  'fechaReemplazo','fechaValorizacion','observaciones','obsRetorno','id','series','created_at'];
// Colecciones que se normalizan al guardar
const _DB_NORMALIZE_KEYS = ['activos', 'repuestos'];
function _normalizeItem(item) {
  if (!item || typeof item !== 'object') return;
  for (const k in item) {
    if (typeof item[k] === 'string' && !_DB_SKIP_NORMALIZE.includes(k) && !k.startsWith('_') && !k.startsWith('fecha')) {
      const upper = item[k].toUpperCase().trim();
      if (upper !== item[k]) item[k] = upper;
    }
  }
}

const DB = (() => {
  // ── LocalStorage como almacenamiento principal (sincrono, confiable) ──
  return {
    init() { return Promise.resolve(); },
    isReady() { return true; },
    flush() { return Promise.resolve(); },

    get(key) {
      try {
        const v = JSON.parse(localStorage.getItem('ati_' + key));
        return Array.isArray(v) ? v : (v ? v : []);
      } catch { return []; }
    },
    set(key, data) {
      // #19: Normalizar campos texto a UPPERCASE al guardar (excepto campos protegidos)
      if (Array.isArray(data) && _DB_NORMALIZE_KEYS.includes(key)) {
        data.forEach(item => _normalizeItem(item));
      }
      try { localStorage.setItem('ati_' + key, JSON.stringify(data)); }
      catch (e) { console.error('DB set error:', key, e); }
      // Invalidar caché de inventario cuando cambian datos relacionados
      if (key === 'activos' || key === 'asignaciones' || key === 'colaboradores') {
        if (typeof _invalidateInvCache === 'function') _invalidateInvCache();
      }
    },
    getConfig(key, def) {
      try {
        const v = JSON.parse(localStorage.getItem('ati_cfg_' + key));
        return v !== undefined && v !== null ? v : def;
      } catch { return def; }
    },
    setConfig(key, val) {
      try { localStorage.setItem('ati_cfg_' + key, JSON.stringify(val)); }
      catch (e) { console.error('DB setConfig error:', key, e); }
    },
    remove(key) {
      localStorage.removeItem('ati_' + key);
    },
    removeConfig(key) {
      localStorage.removeItem('ati_cfg_' + key);
    }
  };
})();

/* ═══════════════════════════════════════════════════════
   JERARQUÍA: Estado CMDB → Estado Equipo (sub-estado)
   ═══════════════════════════════════════════════════════ */
const ESTADO_EQUIPO_MAP = {
  'DISPONIBLE':    ['NUEVO', 'USADO'],
  'ASIGNADO':      ['NUEVO', 'USADO'],
  'MANTENIMIENTO': ['REPARACIÓN', 'GARANTÍA'],
  'BAJA':          ['DESTRUCCIÓN', 'DONACIÓN', 'VENTA']
};
// Lista plana de todos los sub-estados válidos
const ALL_ESTADOS_EQUIPO = Object.values(ESTADO_EQUIPO_MAP).flat();

/* ═══════════════════════════════════════════════════════
   INITIALIZE SAMPLE DATA
   ═══════════════════════════════════════════════════════ */
function initSampleData() {
  if (DB.get('activos').length === 0) DB.set('activos', []);

  const _sm = DB.get('sitiosMoviles');
  if (!_sm || !Array.isArray(_sm)) DB.set('sitiosMoviles', []);
  const _rp = DB.get('repuestos');
  if (!_rp || !Array.isArray(_rp)) DB.set('repuestos', []);
  const _ar = DB.get('asignacionesRep');
  if (!_ar || !Array.isArray(_ar)) DB.set('asignacionesRep', []);

  // Inicializar colecciones vacías si no existen
  if (DB.get('colaboradores').length === 0) DB.set('colaboradores', []);
  if (DB.get('asignaciones').length === 0) DB.set('asignaciones', []);

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
    DB.setConfig('estados', ['Disponible', 'Asignado', 'Mantenimiento', 'Baja']);
  if (!DB.getConfig('ubicaciones', null))
    DB.setConfig('ubicaciones', ['CO SAN BORJA', 'PLAZA REPUBLICA']);
  if (!DB.getConfig('areas', null))
    DB.setConfig('areas', ['TI', 'FINANZAS', 'RRHH', 'OPERACIONES', 'COMERCIAL', 'LEGAL']);
  if (!DB.getConfig('gamas', null))
    DB.setConfig('gamas', ['GAMA A', 'GAMA B', 'GAMA C', 'GAMA D']);
  if (!DB.getConfig('estadosEquipo', null))
    DB.setConfig('estadosEquipo', ['NUEVO', 'USADO', 'REPARACIÓN', 'GARANTÍA', 'DESTRUCCIÓN', 'DONACIÓN', 'VENTA']);
  if (!DB.getConfig('origenes', null))
    DB.setConfig('origenes', ['PROPIO', 'ALQUILADO', 'TERCERO']);
  if (!DB.getConfig('tipoDocumento', null))
    DB.setConfig('tipoDocumento', ['PEDIDO', 'ORDEN DE COMPRA', 'GUÍA DE REMISIÓN', 'FACTURA', 'NOTA DE INGRESO']);
  if (!DB.getConfig('sistemasOS', null))
    DB.setConfig('sistemasOS', ['WIN 10', 'WIN 11', 'WIN 7', 'LINUX', 'MAC OS', 'ANDROID', 'IOS', 'CHROME OS', 'SIN SO']);
  if (!DB.getConfig('tiposRepuesto', null))
    DB.setConfig('tiposRepuesto', ['DISCO DURO', 'MEMORIA RAM', 'PANTALLA', 'TECLADO', 'BATERÍA', 'CARGADOR', 'PLACA MADRE', 'PROCESADOR', 'VENTILADOR', 'CABLE FLEX', 'BISAGRA', 'TOUCHPAD', 'WEBCAM', 'PARLANTE', 'PUERTO USB', 'CONECTOR DC']);
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
    DB.setConfig('tipoAsignacion', ['INGRESO NUEVO', 'REEMPLAZO', 'ASIGNACIÓN', 'PRÉSTAMO', 'RENOVACIÓN', 'REPOSICIÓN DAÑO FÍSICO', 'REPOSICIÓN ROBO']);
  if (!DB.getConfig('mapeoEPAdmin', null))
    DB.setConfig('mapeoEPAdmin', ['LAPTOP']);
  if (!DB.getConfig('mapeoAdicErg', null))
    DB.setConfig('mapeoAdicErg', ['MOCHILA', 'ALZA NOTEBOOK', 'KIT TECLADO-MOUSE INALAMBRICO', 'PAD MOUSE']);
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

  // ── Migración: normalizar repuestos existentes con nuevos campos ──
  _migrateRepuestos();

  // ── Migración: renombrar codInventario → codInv, inv → codInv ──
  _migrateCodInv();
}

function _migrateCodInv() {
  // Migrar series de activos: codInventario → codInv
  const activos = DB.get('activos');
  let aChanged = false;
  activos.forEach(a => {
    if (a.series && Array.isArray(a.series)) {
      a.series.forEach(s => {
        if (s.codInventario !== undefined && s.codInv === undefined) {
          s.codInv = s.codInventario;
          delete s.codInventario;
          aChanged = true;
        }
      });
    }
    // Migrar codInventario a nivel activo (si existe por error legacy)
    if (a.codInventario !== undefined && a.codInv === undefined) {
      a.codInv = a.codInventario;
      delete a.codInventario;
      aChanged = true;
    }
  });
  if (aChanged) DB.set('activos', activos);

  // Migrar bitacora: inv → codInv
  const movs = DB.get('bitacoraMovimientos');
  if (movs && movs.length > 0) {
    let bChanged = false;
    movs.forEach(m => {
      if (m.inv !== undefined && m.codInv === undefined) {
        m.codInv = m.inv;
        delete m.inv;
        bChanged = true;
      }
    });
    if (bChanged) DB.set('bitacoraMovimientos', movs);
  }
}

/**
 * Determina el mapeo funcional de un tipo de equipo.
 * Retorna 'EP-ADMIN', 'ADIC-ERG' o 'ADICIONAL'
 */
function getMapeoFuncional(tipo) {
  if (!tipo) return 'ADICIONAL';
  const tipoUp = tipo.toUpperCase();
  const epAdmin = DB.getConfig('mapeoEPAdmin', []).map(v => v.toUpperCase());
  const adicErg = DB.getConfig('mapeoAdicErg', []).map(v => v.toUpperCase());
  if (epAdmin.includes(tipoUp)) return 'EP-ADMIN';
  if (adicErg.includes(tipoUp)) return 'ADIC-ERG';
  return 'ADICIONAL';
}

function _migrateRepuestos() {
  const reps = DB.get('repuestos');
  if (reps.length === 0) return;
  let changed = false;
  const COMP_TIPOS = ['MEMORIA RAM', 'DISCO DURO / SSD', 'DISCO DURO', 'DISCO SSD'];
  reps.forEach(r => {
    if (!r.categoria) {
      const eq = (r.equipo || '').toUpperCase();
      r.categoria = COMP_TIPOS.some(t => eq.includes(t) || eq === t) ? 'COMPONENTE' : 'PARTE';
      changed = true;
    }
    if (!r.estadoUso) { r.estadoUso = r.uso || r.estadoEquipo || 'NUEVO'; changed = true; }
    if (!r.estadoDisp) { r.estadoDisp = r.disponibilidad || 'DISPONIBLE'; changed = true; }
    if (r.activoAsignadoId === undefined) { r.activoAsignadoId = null; changed = true; }
    if (!r.estadoCMDB) { r.estadoCMDB = r.estadoCmdb || null; changed = true; }
    if (!r.observaciones) { r.observaciones = ''; changed = true; }
    // Normalize tipo field from equipo
    if (!r.tipo && r.equipo) { r.tipo = r.equipo; changed = true; }
  });
  if (changed) DB.set('repuestos', reps);
}

function _migrateConfigToUpper() {
  // Normalizar arrays de catálogos a UPPERCASE (excepto estados que usan Title Case)
  const arrKeys = ['tipos','marcas','ubicaciones','areas','gamas','estadosEquipo','origenes',
    'tipoDocumento','sistemasOS','regiones','departamentos','tiposLocal','sedesAdmin','tipoPuesto','tipoAsignacion','tiposRepuesto'];
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

  // Migrar 'Dado de Baja' → 'Baja' en activos y series existentes
  const _migActivos = DB.get('activos');
  let _migBajaChanged = false;
  _migActivos.forEach(a => {
    if (a.estado === 'Dado de Baja') { a.estado = 'Baja'; _migBajaChanged = true; }
    if (a.series && Array.isArray(a.series)) {
      a.series.forEach(s => {
        if (s.estadoSerie === 'Dado de Baja') { s.estadoSerie = 'Baja'; _migBajaChanged = true; }
      });
    }
  });
  if (_migBajaChanged) DB.set('activos', _migActivos);

  // Migrar config 'estados' si contiene 'Dado de Baja'
  const _cfgEstados = DB.getConfig('estados', []);
  if (_cfgEstados.includes('Dado de Baja')) {
    DB.setConfig('estados', _cfgEstados.map(e => e === 'Dado de Baja' ? 'Baja' : e));
  }
}

// initSampleData se llama después de DB.init() en DOMContentLoaded

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
  _startNotifUpdater();
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
        _startNotifUpdater();
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
    items: [{ key: 'ingreso', label: 'Registro Activo' }, { key: 'repuestos', label: 'Repuestos' }]
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
      { key: 'asignacion', label: 'Asignación de Activos' },
      { key: 'asignacionRepuestos', label: 'Asignación de Repuestos' }
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
  _updateNotifBadge();
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
   NOTIFICACIONES (CAMPANA)
   ═══════════════════════════════════════════════════════ */
let _notifPanelOpen = false;

function _buildNotifications() {
  const notifs = [];
  const colaboradores = DB.get('colaboradores');
  const asignaciones = DB.get('asignaciones');

  // 1. Colaboradores nuevos sin activos asignados
  const colabsActivos = colaboradores.filter(c => (c.estado || '').toUpperCase() === 'ACTIVO');
  const colabsConAsig = new Set(asignaciones.filter(a => a.estado === 'Vigente').map(a => (a.correoColab || '').toUpperCase()));
  const colabsSinActivos = colabsActivos.filter(c => !colabsConAsig.has((c.correo || c.email || '').toUpperCase()));

  if (colabsSinActivos.length > 0) {
    notifs.push({
      type: 'new-colab',
      icon: '👤',
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      title: colabsSinActivos.length === 1
        ? '1 colaborador sin activos'
        : colabsSinActivos.length + ' colaboradores sin activos',
      desc: colabsSinActivos.slice(0, 3).map(c => _fullName(c) || c.correo || '').join(', ') + (colabsSinActivos.length > 3 ? ' y ' + (colabsSinActivos.length - 3) + ' más...' : ''),
      action: 'colab-sin-activos',
      count: colabsSinActivos.length
    });
  }

  // 2. Ceses pendientes (colaboradores cesados con activos vigentes)
  const colabsCesados = colaboradores.filter(c => (c.estado || '').toUpperCase() === 'CESADO' || (c.estado || '').toUpperCase() === 'INACTIVO');
  const cesesPendientes = [];
  colabsCesados.forEach(c => {
    const correo = (c.correo || c.email || '').toUpperCase();
    const asigVigentes = asignaciones.filter(a => a.estado === 'Vigente' && (a.correoColab || '').toUpperCase() === correo);
    if (asigVigentes.length > 0) {
      cesesPendientes.push({ colab: c, activos: asigVigentes.length });
    }
  });

  if (cesesPendientes.length > 0) {
    notifs.push({
      type: 'cese-pendiente',
      icon: '⚠️',
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      title: cesesPendientes.length === 1
        ? '1 cese pendiente de retorno'
        : cesesPendientes.length + ' ceses pendientes de retorno',
      desc: cesesPendientes.slice(0, 3).map(cp => (_fullName(cp.colab)) + ' (' + cp.activos + ' activos)').join(', ') + (cesesPendientes.length > 3 ? ' y ' + (cesesPendientes.length - 3) + ' más...' : ''),
      action: 'ceses-pendientes',
      count: cesesPendientes.length
    });
  }

  // 3. Pendientes de retorno
  const pendRetorno = asignaciones.filter(a => a.pendienteRetorno === true && a.estado !== 'Devuelto');
  if (pendRetorno.length > 0) {
    notifs.push({
      type: 'pend-retorno',
      icon: '🔄',
      iconBg: '#fce7f3',
      iconColor: '#db2777',
      title: pendRetorno.length === 1
        ? '1 retorno pendiente'
        : pendRetorno.length + ' retornos pendientes',
      desc: 'Equipos marcados para retorno que aún no han sido devueltos',
      action: 'pend-retorno',
      count: pendRetorno.length
    });
  }

  // 4. Actas de asignación pendientes
  const bitMovs = DB.get('bitacoraMovimientos');
  const actasPend = bitMovs.filter(m => (m.estadoAsignacion || '').toUpperCase() === 'PENDIENTE');
  if (actasPend.length > 0) {
    notifs.push({
      type: 'actas-pend',
      icon: '📎',
      iconBg: '#ede9fe',
      iconColor: '#7c3aed',
      title: actasPend.length === 1
        ? '1 acta de asignación pendiente'
        : actasPend.length + ' actas de asignación pendientes',
      desc: 'Movimientos de bitácora sin acta adjunta',
      action: 'actas-pendientes',
      count: actasPend.length
    });
  }

  return notifs;
}

function _updateNotifBadge() {
  const notifs = _buildNotifications();
  const totalCount = notifs.reduce((sum, n) => sum + (n.count || 1), 0);
  const countEl = document.getElementById('notifCount');
  const pulseEl = document.getElementById('notifPulse');
  if (!countEl) return;

  if (totalCount > 0) {
    countEl.textContent = totalCount > 99 ? '99+' : totalCount;
    countEl.style.display = 'flex';
    if (pulseEl) pulseEl.style.display = 'block';
  } else {
    countEl.style.display = 'none';
    if (pulseEl) pulseEl.style.display = 'none';
  }
}

function _toggleNotifPanel() {
  _notifPanelOpen = !_notifPanelOpen;
  const panel = document.getElementById('notifPanel');
  if (!panel) return;

  if (_notifPanelOpen) {
    const notifs = _buildNotifications();
    const totalCount = notifs.reduce((sum, n) => sum + (n.count || 1), 0);

    let itemsHTML = '';
    if (notifs.length === 0) {
      itemsHTML = '<div class="notif-empty"><div class="notif-empty-icon">✅</div><p>Sin notificaciones pendientes</p></div>';
    } else {
      itemsHTML = notifs.map(n => {
        return '<div class="notif-item" onclick="_notifAction(\'' + n.action + '\')">'
          + '<div class="notif-item-icon" style="background:' + n.iconBg + ';color:' + n.iconColor + '">' + n.icon + '</div>'
          + '<div class="notif-item-content">'
          + '<div class="notif-item-title">' + esc(n.title) + '</div>'
          + '<div class="notif-item-desc">' + esc(n.desc) + '</div>'
          + '</div>'
          + '</div>';
      }).join('');
    }

    panel.innerHTML = '<div class="notif-panel-header">'
      + '<span>Notificaciones' + (totalCount > 0 ? ' (' + totalCount + ')' : '') + '</span>'
      + '<button onclick="_toggleNotifPanel()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>'
      + '</div>'
      + '<div class="notif-panel-body">' + itemsHTML + '</div>';
    panel.style.display = 'block';

    // Cerrar al hacer clic fuera
    setTimeout(() => {
      document.addEventListener('click', _closeNotifOutside);
    }, 10);
  } else {
    panel.style.display = 'none';
    document.removeEventListener('click', _closeNotifOutside);
  }
}

function _closeNotifOutside(e) {
  const panel = document.getElementById('notifPanel');
  const btn = document.getElementById('notifBellBtn');
  if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
    _notifPanelOpen = false;
    panel.style.display = 'none';
    document.removeEventListener('click', _closeNotifOutside);
  }
}

function _notifAction(action) {
  _notifPanelOpen = false;
  const panel = document.getElementById('notifPanel');
  if (panel) panel.style.display = 'none';
  document.removeEventListener('click', _closeNotifOutside);

  switch (action) {
    case 'colab-sin-activos':
      navigateTo('colaboradores', 'listaColaboradores');
      break;
    case 'ceses-pendientes':
      navigateTo('asignacion', 'pendientesRetorno');
      break;
    case 'pend-retorno':
      navigateTo('asignacion', 'pendientesRetorno');
      break;
    case 'actas-pendientes':
      navigateTo('bitacora', 'movimientos');
      break;
  }
}

// Actualizar notificaciones periódicamente
let _notifInterval = null;
function _startNotifUpdater() {
  _updateNotifBadge();
  if (_notifInterval) clearInterval(_notifInterval);
  _notifInterval = setInterval(_updateNotifBadge, 30000); // cada 30 segundos
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
  if (!arr.length) return 1;
  let max = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].id > max) max = arr[i].id;
  }
  return max + 1;
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

// Helper: nombre completo del colaborador (nombre + apellido)
function _fullName(c) {
  if (!c) return '';
  const n = (c.nombre || '').trim();
  const a = (c.apellido || '').trim();
  return a ? (n + ' ' + a) : n;
}

// Convierte todos los valores string de un objeto a MAYÚSCULAS (excepto campos de fecha, email y password)
const _SKIP_UPPER = ['email','password','usuario','correoColab','correoSupervisor','fechaIngreso','fechaCompra','fechaAsignacion','fechaCese','fechaApertura','adendaFechaInicio','adendaFechaFin','fecha','fechaAprobacion','estado'];
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

/* ═══════════════════════════════════════════════════════
   FUNCIONES UTILITARIAS REUTILIZABLES
   ═══════════════════════════════════════════════════════ */

// #7/#8/#9: Resuelve datos frescos de una asignación (activo, colaborador, repuesto)
// Usa datos actuales si el registro existe; si fue eliminado, usa el snapshot guardado
function resolveAsignacion(a, activos, colaboradores) {
  const activo = activos ? activos.find(x => x.id === a.activoId) : null;
  const colab = colaboradores ? colaboradores.find(c => c.id === a.colaboradorId) : null;
  return {
    ...a,
    activoCodigo: activo ? activo.codigo : (a.activoCodigo || ''),
    activoTipo: activo ? activo.tipo : (a.activoTipo || ''),
    activoMarca: activo ? activo.marca : (a.activoMarca || ''),
    activoModelo: activo ? activo.modelo : (a.activoModelo || ''),
    colaboradorNombre: colab ? _fullName(colab) : (a.colaboradorNombre || ''),
    correoColab: colab ? (colab.email || '') : (a.correoColab || ''),
    area: colab ? (colab.area || '') : (a.area || '')
  };
}

// Resuelve datos frescos de una asignación de repuesto
function resolveAsignacionRep(ar, repuestos) {
  const rep = repuestos ? repuestos.find(r => r.id === ar.repuestoId) : null;
  return {
    ...ar,
    repuestoCodigo: rep ? rep.codigo : (ar.repuestoCodigo || ''),
    repuestoTipo: rep ? (rep.tipo || rep.equipo) : (ar.repuestoTipo || ''),
    repuestoDesc: rep ? `${rep.marca || ''} ${rep.modelo || ''} ${rep.capacidad || ''}`.trim() : (ar.repuestoDesc || '')
  };
}

// #16: Determina si un estado CMDB impide asignación
function isEstadoNoAsignable(estado) {
  const e = (estado || '').toUpperCase();
  return ['BAJA', 'NO RECUPERABLE', 'MANTENIMIENTO'].includes(e);
}

// #17: Establece el responsable de un activo
function setResponsable(activo, colab, sitio) {
  activo.responsable = colab ? _fullName(colab) : (sitio ? _buildSitioNombre(sitio) : '');
}

// #18: Obtiene asignaciones vigentes (fuente única de verdad)
function getAsignacionesVigentes() {
  return DB.get('asignaciones').filter(a => a.estado === 'Vigente');
}

// #20: Valida que todos los estados CMDB tengan mapeo en ESTADO_EQUIPO_MAP
function validarMapeoEstados() {
  const estados = DB.getConfig('estados', []);
  const sinMapeo = estados.filter(e => !ESTADO_EQUIPO_MAP[(e || '').toUpperCase()]);
  if (sinMapeo.length > 0) {
    console.warn('Estados CMDB sin mapeo en ESTADO_EQUIPO_MAP:', sinMapeo);
  }
  return sinMapeo;
}

// #15: Crea un objeto de asignación estándar (fuente única)
function createAsignacion(asigArray, { activo, serie, colab, sitio, fecha, tipoAsignacion, motivo, ticket, observaciones, fechaFinPrestamo, actaEntrega, usoEquipo, reemplazaAsigId }) {
  return upperFields({
    id: nextId(asigArray),
    activoId: activo.id,
    activoCodigo: activo.codigo,
    activoTipo: activo.tipo,
    activoMarca: activo.marca,
    activoModelo: activo.modelo,
    serieAsignada: serie || '',
    colaboradorId: colab ? colab.id : null,
    colaboradorNombre: colab ? _fullName(colab) : (sitio ? _buildSitioNombre(sitio) : ''),
    correoColab: colab ? (colab.email || '') : '',
    area: colab ? colab.area : (sitio ? (sitio.area || '') : ''),
    tipoDestino: sitio ? 'sitio' : 'colaborador',
    sitioId: sitio ? sitio.id : null,
    sitioNombre: sitio ? _buildSitioNombre(sitio) : '',
    fechaAsignacion: fecha || today(),
    tipoAsignacion: tipoAsignacion || motivo || '',
    motivo: motivo || '',
    ticket: (ticket || '').toUpperCase(),
    observaciones: observaciones || '',
    estado: 'Vigente',
    fechaFinPrestamo: fechaFinPrestamo || '',
    actaEntrega: (actaEntrega || '').toUpperCase().trim(),
    usoEquipo: usoEquipo || '',
    reemplazaAsigId: reemplazaAsigId || null
  });
}

// #12: Timer genérico para búsquedas con debounce
const _searchTimers = {};
function debounceSearch(key, fn, delay) {
  clearTimeout(_searchTimers[key]);
  _searchTimers[key] = setTimeout(fn, delay || 120);
}

// #14: Estado de error-filter para cargas masivas (unificado)
const _cmErrorFilters = { equipos: false, colaboradores: false, asignaciones: false };
function toggleCmErrorFilter(module) {
  _cmErrorFilters[module] = !_cmErrorFilters[module];
}
function getCmErrorFilter(module) {
  return _cmErrorFilters[module] || false;
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
    repuestos: renderRepuestos,
    padron: renderPadron,
    asignacion: renderAsignacion,
    asignacionRepuestos: renderAsignacionRepuestos,
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
    'Mantenimiento': '#f59e0b',
    'Baja': '#ef4444'
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
        <div class="stat-value">${byEstado['Mantenimiento'] || 0}</div>
        <div class="stat-label">Mantenimiento</div>
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

function _onIngresoSearch(val) {
  activoSearch = val;
  resetPage('ingreso');
  debounceSearch('ingreso', _renderIngresoTable);
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
                    ? `<span class="badge ${['NUEVO'].includes(a.estadoEquipo) ? 'badge-success' : ['USADO'].includes(a.estadoEquipo) ? 'badge-info' : ['REPARACIÓN','GARANTÍA'].includes(a.estadoEquipo) ? 'badge-warning' : 'badge-danger'}" style="font-size:10px">${esc(a.estadoEquipo)}</span>`
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
  // Al registrar/editar, el estado equipo depende del estado CMDB del activo
  const _estadoCMDB = (a?.estado || 'Disponible').toUpperCase();
  const estadosEquipo = ESTADO_EQUIPO_MAP[_estadoCMDB] || ESTADO_EQUIPO_MAP['DISPONIBLE'];
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
      // Sincronizar snapshots en asignaciones vigentes
      const asig = DB.get('asignaciones');
      let asigChanged = false;
      asig.forEach(a => {
        if (a.activoId === id && a.estado === 'Vigente') {
          a.activoCodigo = activos[idx].codigo;
          a.activoTipo = activos[idx].tipo;
          a.activoMarca = activos[idx].marca;
          a.activoModelo = activos[idx].modelo;
          asigChanged = true;
        }
      });
      if (asigChanged) DB.set('asignaciones', asig);
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
      codInv: '',
      motivo: ''
    });
  }

  DB.set('activos', activos);
  closeModal();
  showToast(id ? 'Activo actualizado' : 'Activo registrado — agrega las series desde Acciones › Serie');
  renderIngreso(document.getElementById('contentArea'));
}

function deleteActivo(id) {
  const activos = DB.get('activos');
  const a = activos.find(x => x.id === id);
  if (!a) return;

  // Verificar datos relacionados
  const asignaciones = DB.get('asignaciones');
  const repuestos = DB.get('repuestos');
  const asigRelacionadas = asignaciones.filter(x => x.activoId === id);
  const repRelacionados = repuestos.filter(r => r.activoAsignadoId === id);
  const vigentes = asigRelacionadas.filter(x => x.estado === 'Vigente');

  let msgConfirm = `¿Está seguro de eliminar el activo ${a.codigo}?`;
  if (vigentes.length > 0) {
    msgConfirm += `\n\n⚠️ ATENCIÓN: Este activo tiene ${vigentes.length} asignación(es) VIGENTE(s).`;
  }
  if (asigRelacionadas.length > 0) {
    msgConfirm += `\n📋 ${asigRelacionadas.length} registro(s) de asignación serán eliminados.`;
  }
  if (repRelacionados.length > 0) {
    msgConfirm += `\n🔧 ${repRelacionados.length} repuesto(s) vinculados serán desvinculados.`;
  }
  msgConfirm += '\n\nEsta acción NO se puede deshacer.';

  if (!confirm(msgConfirm)) return;
  if (!confirm('⚠️ SEGUNDA CONFIRMACIÓN: ¿Realmente desea eliminar este activo y TODA su data asociada?')) return;

  // Limpiar asignaciones relacionadas
  DB.set('asignaciones', asignaciones.filter(x => x.activoId !== id));

  // Limpiar asignaciones de repuestos vinculadas
  const asigRep = DB.get('asignacionesRep');
  DB.set('asignacionesRep', asigRep.filter(ar => ar.activoId !== id));

  // Desvincular repuestos asignados a este activo
  if (repRelacionados.length > 0) {
    repRelacionados.forEach(r => { r.activoAsignadoId = null; r.estadoDisp = 'DISPONIBLE'; });
    DB.set('repuestos', repuestos);
  }

  // Limpiar bitácora relacionada
  const bitacora = DB.get('bitacoraMovimientos');
  bitacora.forEach(b => { if (b.activoId === id) b.activoId = null; });
  DB.set('bitacoraMovimientos', bitacora);

  // Eliminar el activo
  DB.set('activos', activos.filter(x => x.id !== id));
  addMovimiento('Eliminación', `Activo ${a.codigo} eliminado (${asigRelacionadas.length} asig., ${repRelacionados.length} rep. limpiados)`);
  showToast('Activo eliminado y datos relacionados limpiados');
  renderIngreso(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   CARGA MASIVA DESDE EXCEL
   ═══════════════════════════════════════════════════════ */
let _cargaMasivaData = [];
let _cargaMasivaPage = 1;
let _cmShowOnlyErrors = false;
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
  { excel: 'COD_INV',            field: 'codInv' },
  { excel: 'RAM',               field: 'ram' },
  { excel: 'ALMACENAMIENTO',    field: 'almacenamiento' },
  { excel: 'OBSERVACIONES',     field: 'observaciones' }
];

let _cmEquiposStep = 1;
function openCargaMasivaModal() {
  _cargaMasivaData = [];
  _cargaMasivaPage = 1;
  _cmShowOnlyErrors = false;
  _cmEquiposStep = 1;
  openModal('Carga Masiva de Equipos', '<div id="cmContainer"></div>', `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
  _renderCmEquiposStep();
}

function _renderCmEquiposStep() {
  const w = document.getElementById('cmContainer');
  if (!w) return;
  const _stepHTML = (active, done, n, label) => '<div class="rep-cm-step ' + (done ? 'done' : active ? 'active' : '') + '"><span class="rep-cm-step-num">' + (done ? '&#10003;' : n) + '</span><span class="rep-cm-step-label">' + label + '</span></div>';
  const steps = '<div class="rep-cm-steps">'
    + _stepHTML(_cmEquiposStep===1, _cmEquiposStep>1, 1, 'Descargar plantilla')
    + _stepHTML(_cmEquiposStep===2, _cmEquiposStep>2, 2, 'Subir archivo')
    + _stepHTML(_cmEquiposStep===3, _cmEquiposStep>3, 3, 'Revisar preview')
    + _stepHTML(_cmEquiposStep===4, false, 4, 'Confirmar')
    + '</div>';

  if (_cmEquiposStep === 1) {
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" style="text-align:center;padding:30px 0"><div style="font-size:48px;margin-bottom:12px">&#128203;</div><h3 style="margin-bottom:8px">Paso 1: Descargar Plantilla</h3><p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">Descarga la plantilla Excel con el formato correcto para importar equipos.</p><button class="btn btn-primary" onclick="descargarPlantillaExcel();_cmEquiposStep=2;_renderCmEquiposStep()">&#128203; Descargar Plantilla</button><button class="btn btn-secondary" onclick="_cmEquiposStep=2;_renderCmEquiposStep()" style="margin-left:8px">Ya tengo la plantilla &rarr;</button></div></div>';
  } else if (_cmEquiposStep === 2) {
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" style="text-align:center;padding:30px 0"><div class="rep-cm-dropzone" id="cmDropZone" onclick="document.getElementById(\'cmFileInput2\').click()"><div style="font-size:48px;margin-bottom:12px">&#128229;</div><p style="font-weight:600;color:var(--text);margin-bottom:4px">Arrastra o selecciona tu archivo Excel</p><p style="font-size:13px;color:var(--text-secondary)">.xlsx o .xls</p><input type="file" id="cmFileInput2" accept=".xlsx,.xls" style="display:none" onchange="procesarExcel(this.files[0])"></div></div></div>';
    const dz = document.getElementById('cmDropZone');
    if (dz) { dz.ondragover = e => { e.preventDefault(); dz.classList.add('dragover'); }; dz.ondragleave = () => dz.classList.remove('dragover'); dz.ondrop = e => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files.length) procesarExcel(e.dataTransfer.files[0]); }; }
  } else if (_cmEquiposStep === 3) {
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" id="cmPreviewWrap"></div></div>';
    _renderCargaMasivaPreview();
  } else if (_cmEquiposStep === 4) {
    const validos = _cargaMasivaData.filter(r => r._valid).length;
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" style="text-align:center;padding:30px 0"><div style="font-size:48px;margin-bottom:12px">&#9989;</div><h3 style="margin-bottom:8px">Confirmar Importaci&oacute;n</h3><p style="color:var(--text-secondary);margin-bottom:20px">Se importar&aacute;n <strong>' + validos + '</strong> equipos v&aacute;lidos.</p><button class="btn btn-primary" onclick="ejecutarCargaMasiva()" style="font-size:14px;padding:12px 32px">&#128229; Importar ' + validos + ' equipos</button><button class="btn btn-secondary" onclick="_cmEquiposStep=3;_renderCmEquiposStep()" style="margin-left:8px">&larr; Volver</button></div></div>';
  }
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

      // Mostrar progreso para archivos grandes
      const isLarge = rows.length > 500;
      if (isLarge) {
        const container = document.getElementById('cmPreviewWrap') || document.getElementById('cmContainer');
        if (container) container.innerHTML = `<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">⏳</div><h3>Procesando ${rows.length.toLocaleString()} filas...</h3><p style="color:var(--text-secondary);margin-top:8px">Esto puede tomar unos segundos</p><div id="cmProgressBar" style="width:300px;height:6px;background:#e2e8f0;border-radius:3px;margin:16px auto"><div id="cmProgressFill" style="width:0%;height:100%;background:#2563eb;border-radius:3px;transition:width 0.3s"></div></div><div id="cmProgressText" style="font-size:12px;color:var(--text-light)">0%</div></div>`;
      }

      // Pre-calcular catálogos como Sets para O(1) lookup
      const dateFields = ['fechaIngreso', 'adendaFechaInicio', 'adendaFechaFin'];
      const _vTipos     = new Set(DB.getConfig('tipos', []).map(v => v.toUpperCase()));
      const _vOrigenes  = new Set(DB.getConfig('origenes', []).map(v => v.toUpperCase()));
      const _vUbicaciones = new Set(DB.getConfig('ubicaciones', []).map(v => v.toUpperCase()));
      const _validForDisp = ESTADO_EQUIPO_MAP['DISPONIBLE'] || [];
      const _validForDispSet = new Set(_validForDisp.map(v => v.toUpperCase()));

      // Pre-calcular series en BD como Set
      const _seriesEnBD = new Set();
      DB.get('activos').forEach(a => (a.series || []).forEach(s => { if (s.serie) _seriesEnBD.add(s.serie.toUpperCase()); }));

      // Pre-mapear columnas una sola vez
      const firstRowKeys = Object.keys(rows[0]);
      const colMap = {};
      _CM_COLUMNS.forEach(col => {
        colMap[col.field] = firstRowKeys.find(k => k.toUpperCase().replace(/\s+/g, '_') === col.excel.toUpperCase()) || col.excel;
      });

      // Procesar en lotes asíncronos para no bloquear UI
      _cargaMasivaData = [];
      const BATCH = 500;
      let idx = 0;

      function processBatch() {
        const end = Math.min(idx + BATCH, rows.length);
        for (let i = idx; i < end; i++) {
          const row = rows[i];
          const mapped = {};
          _CM_COLUMNS.forEach(col => {
            let val = row[colMap[col.field]];
            if (val === undefined || val === null) val = '';
            mapped[col.field] = (val instanceof Date) ? normalizeDate(val) : String(val).trim();
          });
          dateFields.forEach(f => { if (mapped[f]) mapped[f] = normalizeDate(mapped[f]); });
          Object.keys(mapped).forEach(k => { if (typeof mapped[k] === 'string' && !_SKIP_UPPER.includes(k)) mapped[k] = mapped[k].toUpperCase(); });

          const fieldErrors = {};
          if (!mapped.tipo)   fieldErrors.tipo = 'Vacío';
          if (!mapped.marca)  fieldErrors.marca = 'Vacío';
          if (!mapped.modelo) fieldErrors.modelo = 'Vacío';
          if (mapped.tipo && _vTipos.size && !_vTipos.has(mapped.tipo.toUpperCase()))
            fieldErrors.tipo = 'No existe en catálogo';
          if (mapped.estadoEquipo && !_validForDispSet.has(mapped.estadoEquipo.toUpperCase()))
            fieldErrors.estadoEquipo = 'Solo válido: ' + _validForDisp.join(', ');
          if (mapped.origenEquipo && _vOrigenes.size && !_vOrigenes.has(mapped.origenEquipo.toUpperCase()))
            fieldErrors.origenEquipo = 'No existe en catálogo';
          if (mapped.ubicacion && _vUbicaciones.size && !_vUbicaciones.has(mapped.ubicacion.toUpperCase()))
            fieldErrors.ubicacion = 'No existe en catálogo';
          dateFields.forEach(f => {
            if (mapped[f] && !/^\d{4}-\d{2}-\d{2}$/.test(mapped[f]))
              fieldErrors[f] = 'Formato inválido';
          });
          if (mapped.costo && isNaN(parseFloat(mapped.costo)))
            fieldErrors.costo = 'No es número';

          const hasErrors = Object.keys(fieldErrors).length > 0;
          _cargaMasivaData.push({ ...mapped, _row: i + 2, _fieldErrors: fieldErrors, _valid: !hasErrors });
        }
        idx = end;

        // Actualizar barra de progreso
        if (isLarge) {
          const pct = Math.round((idx / rows.length) * 80);
          const fill = document.getElementById('cmProgressFill');
          const txt = document.getElementById('cmProgressText');
          if (fill) fill.style.width = pct + '%';
          if (txt) txt.textContent = `Validando filas... ${idx.toLocaleString()} / ${rows.length.toLocaleString()}`;
        }

        if (idx < rows.length) {
          setTimeout(processBatch, 0);
        } else {
          // Validar series duplicadas con HashMap O(n)
          if (isLarge) {
            const fill = document.getElementById('cmProgressFill');
            const txt = document.getElementById('cmProgressText');
            if (fill) fill.style.width = '90%';
            if (txt) txt.textContent = 'Verificando series duplicadas...';
          }
          setTimeout(() => {
            const _seriesEnArchivo = {};
            const _dupFirstIdx = {};
            _cargaMasivaData.forEach((r, i) => {
              if (!r.serie) return;
              const su = r.serie.toUpperCase();
              if (_seriesEnBD.has(su)) {
                r._fieldErrors.serie = 'Ya existe en BD';
                r._valid = false;
              }
              if (_seriesEnArchivo[su] !== undefined) {
                r._fieldErrors.serie = 'Duplicada en archivo (fila ' + _seriesEnArchivo[su] + ')';
                r._valid = false;
                const fi = _dupFirstIdx[su];
                if (fi !== undefined) {
                  _cargaMasivaData[fi]._fieldErrors.serie = 'Duplicada en archivo (fila ' + r._row + ')';
                  _cargaMasivaData[fi]._valid = false;
                }
              } else {
                _seriesEnArchivo[su] = r._row;
                _dupFirstIdx[su] = i;
              }
            });

            _cargaMasivaPage = 1;
            _cmEquiposStep = 3;
            _renderCmEquiposStep();
          }, 0);
        }
      }

      // Iniciar procesamiento
      if (isLarge) {
        _cmEquiposStep = 3;
        _renderCmEquiposStep();
        setTimeout(processBatch, 50);
      } else {
        processBatch();
      }
    } catch (err) {
      showToast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function _renderCargaMasivaPreview() {
  const container = document.getElementById('cmPreviewWrap') || document.getElementById('cmContainer');
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

  // Filtrar datos según toggle
  const filteredData = _cmShowOnlyErrors ? _cargaMasivaData.filter(r => !r._valid) : _cargaMasivaData;
  const filteredTotal = filteredData.length;

  const tp = Math.max(1, Math.ceil(filteredTotal / _CM_PAGE_SIZE));
  if (_cargaMasivaPage > tp) _cargaMasivaPage = tp;
  const start = (_cargaMasivaPage - 1) * _CM_PAGE_SIZE;
  const pageData = filteredData.slice(start, start + _CM_PAGE_SIZE);

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
      <div style="flex:1;min-width:100px;padding:10px 14px;background:${errores > 0 ? '#fef2f2' : '#f8fafc'};border-radius:8px;text-align:center;cursor:${errores > 0 ? 'pointer' : 'default'}" ${errores > 0 ? 'onclick="_cmShowOnlyErrors=!_cmShowOnlyErrors;_cargaMasivaPage=1;_renderCargaMasivaPreview()"' : ''}>
        <div style="font-size:22px;font-weight:700;color:${errores > 0 ? '#dc2626' : '#94a3b8'}">${errores}</div>
        <div style="font-size:11px;color:${errores > 0 ? '#b91c1c' : '#64748b'}">Con errores ${_cmShowOnlyErrors ? '(filtrado)' : ''}</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#f8fafc;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#334155">${total}</div>
        <div style="font-size:11px;color:#64748b">Filas Excel</div>
      </div>
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#1e40af">ℹ️ Las filas con mismo Tipo + Marca + Modelo se fusionarán en <strong>${nLotes} modelo(s)</strong>. Celdas <span style="background:#dcfce7;padding:1px 6px;border-radius:3px">verdes</span> = correctas, <span style="background:#fecaca;padding:1px 6px;border-radius:3px">rojas</span> = con error.</div>
    ${errores > 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#991b1b;display:flex;align-items:center;justify-content:space-between">
      <span>⚠️ <strong>${errores} fila(s) con error</strong> no se importarán.</span>
      <button class="btn btn-sm" onclick="_cmShowOnlyErrors=!_cmShowOnlyErrors;_cargaMasivaPage=1;_renderCargaMasivaPreview()" style="font-size:11px;padding:3px 10px;background:${_cmShowOnlyErrors ? '#dc2626' : '#fff'};color:${_cmShowOnlyErrors ? '#fff' : '#dc2626'};border:1px solid #dc2626;border-radius:4px;cursor:pointer">${_cmShowOnlyErrors ? '📋 Ver todos' : '⚠ Ver solo errores'}</button>
    </div>` : ''}

    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;font-size:12px">
        <thead>
          <tr>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">#</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary);text-align:center">✓</th>
            <th style="padding:8px 6px;font-size:11px;background:#fef2f2;color:#991b1b;min-width:220px">ERROR</th>
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
            <tr style="${r._valid ? '' : 'background:#fef2f2'}">
              <td style="padding:6px;color:var(--text-light)">${r._row}</td>
              <td style="padding:6px;text-align:center">${r._valid ? '<span style="color:#16a34a;font-weight:700">✓</span>' : '<span style="color:#dc2626;font-weight:700">✗</span>'}</td>
              <td style="padding:6px;font-size:10px;color:#dc2626;font-weight:${errList ? '600' : 'normal'}">${errList ? esc(errList) : '<span style="color:#16a34a">—</span>'}</td>
              <td style="padding:6px;${cellStyle('tipo', r.tipo)}" ${fe.tipo ? 'title="'+esc(fe.tipo)+'"' : ''}>${esc(r.tipo || '—')}</td>
              <td style="padding:6px;${cellStyle('marca', r.marca)}" ${fe.marca ? 'title="'+esc(fe.marca)+'"' : ''}>${esc(r.marca || '—')}</td>
              <td style="padding:6px;${cellStyle('modelo', r.modelo)}" ${fe.modelo ? 'title="'+esc(fe.modelo)+'"' : ''}>${esc(r.modelo || '—')}</td>
              <td style="padding:6px;font-size:11px;${cellStyle('serie', r.serie)}" ${fe.serie ? 'title="'+esc(fe.serie)+'"' : ''}>${esc(r.serie || '—')}</td>
              <td style="padding:6px;font-size:11px;${r.codInv ? ok : ''}">${esc(r.codInv || '—')}</td>
              <td style="padding:6px;font-size:11px;${r.ram ? ok : ''}">${esc(r.ram || '—')}</td>
              <td style="padding:6px;font-size:11px;${r.almacenamiento ? ok : ''}">${esc(r.almacenamiento || '—')}</td>
              <td style="padding:6px;${cellStyle('estadoEquipo', r.estadoEquipo)}" ${fe.estadoEquipo ? 'title="'+esc(fe.estadoEquipo)+'"' : ''}>${esc(r.estadoEquipo || '—')}</td>
              <td style="padding:6px;${cellStyle('origenEquipo', r.origenEquipo)}" ${fe.origenEquipo ? 'title="'+esc(fe.origenEquipo)+'"' : ''}>${esc(r.origenEquipo || '—')}</td>
              <td style="padding:6px;font-size:11px;${cellStyle('ubicacion', r.ubicacion)}" ${fe.ubicacion ? 'title="'+esc(fe.ubicacion)+'"' : ''}>${esc(r.ubicacion || '—')}</td>
              <td style="padding:6px;font-size:11px;${cellStyle('fechaIngreso', r.fechaIngreso)}" ${fe.fechaIngreso ? 'title="'+esc(fe.fechaIngreso)+'"' : ''}>${r.fechaIngreso ? formatDate(r.fechaIngreso) : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${tp > 1 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;color:var(--text-light)">
        <span>Mostrando ${start + 1}–${Math.min(start + _CM_PAGE_SIZE, filteredTotal)} de ${filteredTotal}${_cmShowOnlyErrors ? ' (solo errores)' : ''}</span>
        <div style="display:flex;gap:4px">
          ${_cargaMasivaPage > 1 ? `<button class="btn btn-sm" onclick="_cargaMasivaPage--;_renderCargaMasivaPreview()" style="font-size:11px;padding:3px 8px">‹ Ant</button>` : ''}
          <span style="padding:3px 8px;font-weight:600">${_cargaMasivaPage} / ${tp}</span>
          ${_cargaMasivaPage < tp ? `<button class="btn btn-sm" onclick="_cargaMasivaPage++;_renderCargaMasivaPreview()" style="font-size:11px;padding:3px 8px">Sig ›</button>` : ''}
        </div>
      </div>
    ` : ''}

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
      <button class="btn btn-secondary" onclick="_cmEquiposStep=2;_cargaMasivaData=[];_renderCmEquiposStep()">&larr; Subir otro archivo</button>
      ${validos > 0 ? `<button class="btn btn-primary" onclick="_cmEquiposStep=4;_renderCmEquiposStep()">Continuar con ${validos} v&aacute;lidos &rarr;</button>` : '<span style="color:#dc2626;font-weight:600">No hay registros v&aacute;lidos</span>'}
    </div>
  `;
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

async function ejecutarCargaMasiva() {
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
        codInv: r.codInv || '',
        ram: r.ram || '',
        almacenamiento: r.almacenamiento || ''
      });
    }
  });

  const activos = DB.get('activos');
  let lastId = nextId(activos) - 1;
  const lotesKeys = Object.keys(lotes);
  let nuevos = 0, fusionados = 0;

  // Pre-indexar activos existentes por tipo+marca+modelo para O(1) lookup
  const _activoIdx = {};
  activos.forEach((a, idx) => {
    const k = [(a.tipo||'').toLowerCase(),(a.marca||'').toLowerCase(),(a.modelo||'').toLowerCase()].join('||');
    _activoIdx[k] = idx;
  });

  lotesKeys.forEach(key => {
    const { data: r, series } = lotes[key];

    // Buscar si ya existe un activo con el mismo tipo+marca+modelo (O(1))
    const _lookupKey = [(r.tipo||'').toLowerCase(),(r.marca||'').toLowerCase(),(r.modelo||'').toLowerCase()].join('||');
    const existente = _activoIdx[_lookupKey] !== undefined ? activos[_activoIdx[_lookupKey]] : null;

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
        codInv: s.codInv || '',
        motivo: ''
      });
    });
  });

  _cargaMasivaData = [];
  await DB.flush();
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
          <label style="font-size:12px;font-weight:500;color:var(--text);display:block;margin-bottom:4px">Cod. Inv</label>
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
      codInv: '',
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
  if (typeof s === 'string') return { serie: s, ram: '', almacenamiento: '', codInv: '' };
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
      <td style="font-size:12px">${esc(s.codInv || '—')}</td>
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
    codInv: codInvInput ? codInvInput.value.trim() : '',
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
   REPUESTOS — REGISTRO DE PARTES Y REPUESTOS
   ═══════════════════════════════════════════════════════ */

/* ── Constants ── */
const _REP_COMP_TIPOS = ['MEMORIA RAM', 'DISCO DURO / SSD'];
const _REP_PARTE_TIPOS = ['PANTALLA', 'BACK COVER', 'TOP COVER', 'TECLADO', 'BATERIA', 'CARGADOR', 'BISAGRA', 'TOUCHPAD', 'WEBCAM', 'PARLANTE', 'CABLE FLEX', 'PUERTO USB', 'CONECTOR DC', 'VENTILADOR', 'PLACA MADRE'];
const _REP_CAPACIDADES = ['4 GB','8 GB','16 GB','32 GB','64 GB','128 GB','256 GB','512 GB','1 TB','2 TB'];
const _REP_ESTADOS_CMDB = {
  DISPONIBLE: ['USADO BUENO', 'USADO REGULAR'],
  MANTENIMIENTO: ['EN DIAGNOSTICO', 'EN REPARACION', 'EN ESPERA DE PIEZAS'],
  BAJA: ['OBSOLETO', 'DANADO IRREPARABLE', 'PERDIDA / ROBO', 'DESTRUIDO FISICAMENTE']
};

/* ── State ── */
let _repStockEstado = 'Todos';
let _repStockSearch = '';
// Filtros de repuestos consolidados en _repActiveFilters
let _repStockPage = 1;
const _REP_STOCK_PAGE_SIZE = 15;
let _repIngCat = '';
let _repCmStep = 1;
let _cargaMasivaRepData = [];

/* ── Stats Helper ── */
function _getRepStats() {
  const all = DB.get('repuestos');
  const comp = all.filter(r => (r.categoria || '').toUpperCase() === 'COMPONENTE').length;
  const parte = all.length - comp;
  const disp = all.filter(r => (r.estadoDisp || 'DISPONIBLE') === 'DISPONIBLE');
  const nuevos = disp.filter(r => (r.estadoUso || 'NUEVO') === 'NUEVO').length;
  const usados = disp.length - nuevos;
  return {
    total: all.length, comp, parte,
    disponibles: disp.length, nuevos, usados,
    asignados: all.filter(r => r.estadoDisp === 'ASIGNADO').length,
    retorno: all.filter(r => r.estadoDisp === 'PENDIENTE_RETORNO').length,
    mantenimiento: all.filter(r => r.estadoDisp === 'MANTENIMIENTO').length,
    baja: all.filter(r => r.estadoDisp === 'BAJA').length
  };
}

/* ══════════════════════════════════════
   MAIN RENDER
   ══════════════════════════════════════ */
function renderRepuestos(el) {
  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Repuestos</h1>
        <div class="subtitle">Registro de partes y repuestos de equipos</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="_openRepNuevoModal()">+ Nuevo Repuesto</button>
        <button class="btn" onclick="_openRepCargaMasivaModal()" style="background:#059669;color:#fff;border-color:#059669">&#128229; Carga Masiva</button>
      </div>
    </div>
    <div id="repContent"></div>
  `;
  _renderRepStock();
}

/* ══════════════════════════════════════
   NUEVO REPUESTO (Modal)
   ══════════════════════════════════════ */
function _openRepNuevoModal() {
  _repIngCat = '';
  openModal('Registrar Repuesto', '<div id="repIngresoBody"></div>', '', 'modal-lg');
  _renderRepIngresoIndividual();
}

function _renderRepIngresoIndividual() {
  const body = document.getElementById('repIngresoBody');
  if (!body) return;
  const repuestos = DB.get('repuestos');
  const nextCode = 'REP-' + String(nextId(repuestos)).padStart(5, '0');
  const marcas = DB.getConfig('marcas', []);
  const ubicaciones = DB.getConfig('ubicaciones', []);
  const tiposDoc = DB.getConfig('tipoDocumento', []);
  const isComp = _repIngCat === 'COMPONENTE';
  const isParte = _repIngCat === 'PARTE';
  const tiposForCat = isComp ? _REP_COMP_TIPOS : isParte ? _REP_PARTE_TIPOS : [];

  body.innerHTML = `
    <div class="rep-ingreso-card">
      <div class="rep-ingreso-header">
        <h2>Registrar Repuesto</h2>
        <div class="rep-code-chip">${nextCode}</div>
      </div>

      <!-- SECCION 1: Categoria -->
      <div class="rep-section">
        <div class="rep-section-title">
          <span class="rep-section-num">1</span>
          <span class="rep-section-label">Selecciona la categor&iacute;a</span>
        </div>
        <div class="rep-cat-cards">
          <div class="rep-cat-card${isComp ? ' selected-comp' : ''}" onclick="_repIngCat='COMPONENTE';_renderRepIngresoIndividual()">
            <div class="cat-icon">&#9881;&#65039;</div>
            <div class="cat-name">COMPONENTE</div>
            <div class="cat-desc">Memoria RAM, Disco Duro / SSD</div>
          </div>
          <div class="rep-cat-card${isParte ? ' selected-parte' : ''}" onclick="_repIngCat='PARTE';_renderRepIngresoIndividual()">
            <div class="cat-icon">&#128295;</div>
            <div class="cat-name">PARTE</div>
            <div class="cat-desc">Pantalla, Teclado, Bater&iacute;a, etc.</div>
          </div>
        </div>
      </div>

      ${_repIngCat ? `
      <!-- SECCION 2: Datos de ingreso -->
      <div class="rep-section">
        <div class="rep-section-title">
          <span class="rep-section-num">2</span>
          <span class="rep-section-label">Datos de ingreso</span>
        </div>
        <div class="form-grid-3">
          <div class="form-group">
            <label>Fecha Ingreso</label>
            <input type="date" class="form-control" id="fRepFecha" value="${today()}">
          </div>
          <div class="form-group">
            <label>Almac&eacute;n</label>
            <select class="form-control" id="fRepAlmacen">
              <option value="">Seleccionar...</option>
              ${optionsHTML(ubicaciones, '')}
            </select>
          </div>
          <div class="form-group">
            <label>Estado de Uso</label>
            <select class="form-control" id="fRepEstadoUso">
              <option value="NUEVO">Nuevo</option>
              <option value="USADO">Usado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Tipo Documento</label>
            <select class="form-control" id="fRepTipoDoc">
              <option value="">Seleccionar...</option>
              ${optionsHTML(tiposDoc, '')}
            </select>
          </div>
          <div class="form-group">
            <label>N&deg; Documento / Ticket</label>
            <input class="form-control" id="fRepNDoc" placeholder="Ingrese n&uacute;mero">
          </div>
        </div>
      </div>

      <!-- SECCION 3: Identificacion -->
      <div class="rep-section">
        <div class="rep-section-title">
          <span class="rep-section-num">3</span>
          <span class="rep-section-label">Identificaci&oacute;n del repuesto</span>
        </div>
        <div class="form-grid-3">
          <div class="form-group">
            <label>Tipo <span class="required">*</span></label>
            <select class="form-control" id="fRepTipo">
              <option value="">Seleccionar...</option>
              ${tiposForCat.map(t => '<option value="' + esc(t) + '">' + esc(t) + '</option>').join('')}
            </select>
          </div>
          ${isComp ? `
          <div class="form-group">
            <label>Capacidad <span class="required">*</span></label>
            <select class="form-control" id="fRepCapacidad">
              <option value="">Seleccionar...</option>
              ${_REP_CAPACIDADES.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('')}
            </select>
          </div>` : ''}
          <div class="form-group">
            <label>Marca <span class="required">*</span></label>
            <select class="form-control" id="fRepMarca">
              <option value="">Seleccionar...</option>
              ${optionsHTML(marcas, '')}
            </select>
          </div>
          <div class="form-group">
            <label>Modelo <span class="required">*</span></label>
            <input class="form-control" id="fRepModelo" placeholder="Ingrese el modelo">
          </div>
          <div class="form-group">
            <label>N&deg; Serie${isComp ? ' <span class="required">*</span>' : ''}</label>
            <input class="form-control" id="fRepSerie" placeholder="${isComp ? 'Obligatorio' : 'Opcional'}">
          </div>
          <div class="form-group">
            <label>PartNumber</label>
            <input class="form-control" id="fRepPartNumber" placeholder="Ingrese PartNumber">
          </div>
          <div class="form-group">
            <label>SKU</label>
            <input class="form-control" id="fRepSku" placeholder="Ingrese SKU">
          </div>
          <div class="form-group span2">
            <label>Observaciones</label>
            <input class="form-control" id="fRepObs" placeholder="Observaciones adicionales">
          </div>
        </div>
      </div>

      <div class="rep-ingreso-footer">
        <button class="btn btn-secondary" onclick="_repIngCat='';_renderRepIngresoIndividual()">Limpiar</button>
        <button class="btn btn-primary" onclick="_saveRepIndividual()">&#128190; Registrar Repuesto</button>
      </div>
      ` : ''}
    </div>
  `;
}

function _saveRepIndividual() {
  const tipo = (document.getElementById('fRepTipo') || {}).value;
  const marca = (document.getElementById('fRepMarca') || {}).value;
  const modelo = (document.getElementById('fRepModelo') || {}).value.trim();
  const serie = (document.getElementById('fRepSerie') || {}).value.trim();
  const isComp = _repIngCat === 'COMPONENTE';
  const capacidad = isComp ? (document.getElementById('fRepCapacidad') || {}).value : '';

  if (!tipo || !marca || !modelo) { showToast('Completa Tipo, Marca y Modelo', 'error'); return; }
  if (isComp && !serie) { showToast('La serie es obligatoria para componentes', 'error'); return; }
  if (isComp && !capacidad) { showToast('La capacidad es obligatoria para componentes', 'error'); return; }

  const repuestos = DB.get('repuestos');
  if (serie) {
    const dup = repuestos.find(r => (r.serie || '').toUpperCase() === serie.toUpperCase());
    if (dup) { showToast('Ya existe un repuesto con esa serie: ' + dup.codigo, 'error'); return; }
  }

  const newId = nextId(repuestos);
  const codigo = 'REP-' + String(newId).padStart(5, '0');
  const nDoc = (document.getElementById('fRepNDoc') || {}).value.trim();

  const obj = upperFields({
    id: newId, codigo,
    categoria: _repIngCat,
    tipo,
    capacidad,
    marca,
    modelo,
    serie: serie || _generarSerieRepuesto(tipo),
    partNumber: (document.getElementById('fRepPartNumber') || {}).value.trim(),
    sku: (document.getElementById('fRepSku') || {}).value.trim(),
    estadoUso: (document.getElementById('fRepEstadoUso') || {}).value || 'NUEVO',
    estadoDisp: 'DISPONIBLE',
    estadoCMDB: null,
    activoAsignadoId: null,
    almacen: (document.getElementById('fRepAlmacen') || {}).value,
    tipoDocumento: (document.getElementById('fRepTipoDoc') || {}).value,
    nDocumento: nDoc,
    fechaIngreso: (document.getElementById('fRepFecha') || {}).value || today(),
    observaciones: (document.getElementById('fRepObs') || {}).value.trim(),
    equipo: tipo
  });
  repuestos.push(obj);
  DB.set('repuestos', repuestos);

  const detalle = codigo + ' - ' + _repIngCat + ' ' + tipo + (capacidad ? ' ' + capacidad : '') + ' ' + marca + ' ' + modelo + (nDoc ? ' | Ticket: ' + nDoc : '');
  addMovimiento('INGRESO REPUESTO', detalle);
  closeModal();
  showToast('Repuesto ' + codigo + ' registrado');
  _repIngCat = '';
  renderRepuestos(document.getElementById('contentArea'));
}

/* ── Carga Masiva ── */
const _REP_CM_COLUMNS = [
  { excel: 'CATEGORIA',    field: 'categoria',    required: true },
  { excel: 'TIPO',         field: 'tipo',         required: true },
  { excel: 'CAPACIDAD',    field: 'capacidad' },
  { excel: 'MARCA',        field: 'marca',        required: true },
  { excel: 'MODELO',       field: 'modelo',       required: true },
  { excel: 'SERIE',        field: 'serie' },
  { excel: 'PARTNUMBER',   field: 'partNumber' },
  { excel: 'SKU',          field: 'sku' },
  { excel: 'ESTADO_USO',   field: 'estadoUso' },
  { excel: 'ALMACEN',      field: 'almacen' },
  { excel: 'N_DOCUMENTO',  field: 'nDocumento' },
  { excel: 'FECHA_INGRESO', field: 'fechaIngreso' },
  { excel: 'OBSERVACIONES', field: 'observaciones' }
];

function _openRepCargaMasivaModal() {
  _repCmStep = 1;
  _cargaMasivaRepData = [];
  openModal('Carga Masiva de Repuestos', '<div id="repCmContainer"></div>', `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
  _renderRepCargaMasiva();
}

function _renderRepCargaMasiva() {
  const body = document.getElementById('repCmContainer');
  if (!body) return;
  const stepLabels = ['Descargar plantilla', 'Subir archivo', 'Revisar preview', 'Confirmar'];
  body.innerHTML = `
    <div class="rep-cm-layout">
      <div class="rep-cm-steps">
        ${stepLabels.map((l, i) => {
          const n = i + 1;
          const cls = n < _repCmStep ? 'done' : n === _repCmStep ? 'active' : '';
          return '<div class="rep-cm-step ' + cls + '"><span class="rep-cm-step-num">' + (n < _repCmStep ? '&#10003;' : n) + '</span><span class="rep-cm-step-label">' + l + '</span></div>';
        }).join('')}
      </div>
      <div class="rep-cm-work" id="repCmWork"></div>
    </div>
  `;
  _renderRepCmStep();
}

function _renderRepCmStep() {
  const w = document.getElementById('repCmWork');
  if (!w) return;
  if (_repCmStep === 1) {
    w.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:12px">&#128203;</div>
        <h3 style="margin-bottom:8px">Paso 1: Descargar Plantilla</h3>
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">Descarga la plantilla Excel con el formato correcto para importar repuestos.</p>
        <button class="btn btn-primary" onclick="_descargarPlantillaRepuestos();_repCmStep=2;_renderRepCargaMasiva()">&#128203; Descargar Plantilla</button>
        <button class="btn btn-secondary" onclick="_repCmStep=2;_renderRepCargaMasiva()" style="margin-left:8px">Ya tengo la plantilla &rarr;</button>
      </div>
    `;
  } else if (_repCmStep === 2) {
    w.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div class="rep-cm-dropzone" id="repCmDropZone" onclick="document.getElementById('repCmFileInput').click()">
          <div style="font-size:48px;margin-bottom:12px">&#128229;</div>
          <p style="font-weight:600;color:var(--text);margin-bottom:4px">Arrastra o selecciona tu archivo Excel</p>
          <p style="font-size:13px;color:var(--text-secondary)">.xlsx o .xls</p>
          <input type="file" id="repCmFileInput" accept=".xlsx,.xls" style="display:none" onchange="_procesarExcelRepuestos(this.files[0])">
        </div>
      </div>
    `;
    const dz = document.getElementById('repCmDropZone');
    if (dz) {
      dz.ondragover = function(e) { e.preventDefault(); dz.classList.add('dragover'); };
      dz.ondragleave = function() { dz.classList.remove('dragover'); };
      dz.ondrop = function(e) { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files.length) _procesarExcelRepuestos(e.dataTransfer.files[0]); };
    }
  } else if (_repCmStep === 3) {
    _renderRepCmPreview(w);
  } else if (_repCmStep === 4) {
    const validos = _cargaMasivaRepData.filter(r => r._valid).length;
    w.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:12px">&#9989;</div>
        <h3 style="margin-bottom:8px">Confirmar Importaci&oacute;n</h3>
        <p style="color:var(--text-secondary);margin-bottom:20px">Se importar&aacute;n <strong>${validos}</strong> repuestos v&aacute;lidos.</p>
        <button class="btn btn-primary" onclick="_ejecutarCargaMasivaRep()" style="font-size:14px;padding:12px 32px">&#128229; Importar ${validos} repuestos</button>
        <button class="btn btn-secondary" onclick="_repCmStep=3;_renderRepCargaMasiva()" style="margin-left:8px">&larr; Volver</button>
      </div>
    `;
  }
}

function _descargarPlantillaRepuestos() {
  const headers = _REP_CM_COLUMNS.map(c => c.excel);
  const ej1 = ['COMPONENTE', 'MEMORIA RAM', '8 GB', 'KINGSTON', 'VALUERAM DDR4', 'KVR32-A1B2C3D4', '', '', 'NUEVO', 'ALMACEN CENTRAL', '', '', ''];
  const ej2 = ['PARTE', 'PANTALLA', '', 'LG DISPLAY', '15.6 FHD IPS', '', '', '', 'NUEVO', 'ALMACEN TI', '', '', ''];
  const ws = XLSX.utils.aoa_to_sheet([headers, ej1, ej2]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Repuestos');
  XLSX.writeFile(wb, 'Plantilla_Repuestos.xlsx');
  showToast('Plantilla descargada');
}

function _procesarExcelRepuestos(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) { showToast('Archivo vacio', 'error'); return; }

      const existentes = DB.get('repuestos');
      const seriesExist = new Set(existentes.map(r => (r.serie || '').toUpperCase()));
      const seenInFile = {};

      _cargaMasivaRepData = rows.map((row, i) => {
        const mapped = {};
        const rowKeys = Object.keys(row);
        _REP_CM_COLUMNS.forEach(col => {
          const matchKey = rowKeys.find(k => k.toUpperCase().replace(/\s+/g, '_') === col.excel.toUpperCase()) || col.excel;
          let val = row[matchKey];
          if (val === undefined || val === null) val = '';
          mapped[col.field] = (val instanceof Date) ? normalizeDate(val) : String(val).trim();
        });
        if (mapped.fechaIngreso) mapped.fechaIngreso = normalizeDate(mapped.fechaIngreso);
        Object.keys(mapped).forEach(k => { if (typeof mapped[k] === 'string' && !_SKIP_UPPER.includes(k) && k !== 'observaciones') mapped[k] = mapped[k].toUpperCase(); });

        const errors = [];
        const cat = (mapped.categoria || '').toUpperCase();
        if (!cat || (cat !== 'COMPONENTE' && cat !== 'PARTE')) errors.push('CATEGORIA invalida');
        if (!mapped.tipo) errors.push('TIPO requerido');
        if (!mapped.marca) errors.push('MARCA requerida');
        if (!mapped.modelo) errors.push('MODELO requerido');
        if (cat === 'COMPONENTE' && !mapped.serie) errors.push('SERIE requerida (componente)');
        if (cat === 'COMPONENTE' && !mapped.capacidad) errors.push('CAPACIDAD requerida (componente)');

        if (mapped.serie) {
          const su = mapped.serie.toUpperCase();
          if (seriesExist.has(su)) errors.push('SERIE DUPLICADA (ya existe)');
          else if (seenInFile[su] !== undefined) errors.push('SERIE DUPLICADA en archivo');
          else seenInFile[su] = i;
        }

        return { ...mapped, _row: i + 2, _errors: errors, _valid: errors.length === 0 };
      });

      _repCmStep = 3;
      _renderRepCargaMasiva();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };
  reader.readAsArrayBuffer(file);
}

function _renderRepCmPreview(w) {
  const total = _cargaMasivaRepData.length;
  const validos = _cargaMasivaRepData.filter(r => r._valid).length;
  const invalidos = total - validos;
  w.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
      <span style="font-size:14px;font-weight:700">Total: ${total}</span>
      <span style="font-size:14px;color:#059669;font-weight:700">&#10003; V&aacute;lidos: ${validos}</span>
      ${invalidos > 0 ? '<span style="font-size:14px;color:#dc2626;font-weight:700">&#10007; Con errores: ' + invalidos + '</span>' : ''}
    </div>
    <div style="max-height:350px;overflow:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;font-size:11px;border-collapse:collapse">
        <thead><tr style="background:#f8fafc;position:sticky;top:0">
          <th style="padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">#</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Cat.</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Tipo</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Cap.</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Marca</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Modelo</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Serie</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Estado</th>
        </tr></thead>
        <tbody>
          ${_cargaMasivaRepData.map(r => '<tr style="border-bottom:1px solid #f1f5f9;' + (!r._valid ? 'background:#fef2f2' : 'background:#f0fdf4') + '">'
            + '<td style="padding:6px">' + r._row + '</td>'
            + '<td style="padding:6px">' + esc(r.categoria || '') + '</td>'
            + '<td style="padding:6px">' + esc(r.tipo || '') + '</td>'
            + '<td style="padding:6px">' + esc(r.capacidad || '') + '</td>'
            + '<td style="padding:6px">' + esc(r.marca || '') + '</td>'
            + '<td style="padding:6px">' + esc(r.modelo || '') + '</td>'
            + '<td style="padding:6px;font-family:monospace">' + esc(r.serie || '<auto>') + '</td>'
            + '<td style="padding:6px">' + (r._valid ? '<span style="color:#059669;font-weight:700">&#10003; OK</span>' : '<span style="color:#dc2626;font-size:10px">' + r._errors.join(', ') + '</span>') + '</td>'
            + '</tr>').join('')}
        </tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
      <button class="btn btn-secondary" onclick="_repCmStep=2;_cargaMasivaRepData=[];_renderRepCargaMasiva()">&larr; Subir otro archivo</button>
      ${validos > 0 ? '<button class="btn btn-primary" onclick="_repCmStep=4;_renderRepCargaMasiva()">Continuar con ' + validos + ' v&aacute;lidos &rarr;</button>' : '<span style="color:#dc2626;font-weight:600">No hay registros v&aacute;lidos</span>'}
    </div>
  `;
}

async function _ejecutarCargaMasivaRep() {
  const validos = _cargaMasivaRepData.filter(r => r._valid);
  if (validos.length === 0) return;

  const repuestos = DB.get('repuestos');
  validos.forEach(r => {
    const newId = nextId(repuestos);
    const codigo = 'REP-' + String(newId).padStart(5, '0');
    let serie = r.serie;
    if (!serie) serie = _generarSerieRepuesto(r.tipo || r.equipo || 'REP');
    repuestos.push(upperFields({
      id: newId, codigo,
      categoria: r.categoria || 'PARTE',
      tipo: r.tipo,
      equipo: r.tipo,
      capacidad: r.capacidad || '',
      marca: r.marca,
      modelo: r.modelo,
      serie,
      partNumber: r.partNumber || '',
      sku: r.sku || '',
      estadoUso: r.estadoUso || 'NUEVO',
      estadoDisp: 'DISPONIBLE',
      estadoCMDB: null,
      activoAsignadoId: null,
      almacen: r.almacen || '',
      tipoDocumento: '',
      nDocumento: r.nDocumento || '',
      fechaIngreso: r.fechaIngreso || today(),
      observaciones: r.observaciones || ''
    }));
  });
  DB.set('repuestos', repuestos);
  _cargaMasivaRepData = [];
  _repCmStep = 1;
  addMovimiento('CARGA MASIVA REPUESTOS', validos.length + ' repuestos importados desde Excel');
  await DB.flush();
  closeModal();
  showToast(validos.length + ' repuestos importados correctamente');
  renderRepuestos(document.getElementById('contentArea'));
}

/* ══════════════════════════════════════
   TAB 2 — STOCK E INVENTARIO
   ══════════════════════════════════════ */
function _renderRepStock() {
  const c = document.getElementById('repContent');
  if (!c) return;
  const s = _getRepStats();

  c.innerHTML = `
    <!-- KPI Cards -->
    <div class="rep-kpi-grid">
      <div class="rep-kpi-card kpi-total">
        <div class="rep-kpi-value">${s.total}</div>
        <div class="rep-kpi-label">Total Repuestos</div>
        <div class="rep-kpi-sub">${s.comp} comp &middot; ${s.parte} partes</div>
      </div>
      <div class="rep-kpi-card kpi-disponible">
        <div class="rep-kpi-value">${s.disponibles}</div>
        <div class="rep-kpi-label">Disponibles</div>
        <div class="rep-kpi-sub">N&deg;${s.nuevos} &middot; U&deg;${s.usados}</div>
      </div>
      <div class="rep-kpi-card kpi-asignado">
        <div class="rep-kpi-value">${s.asignados}</div>
        <div class="rep-kpi-label">Asignados</div>
        <div class="rep-kpi-sub">En uso activo</div>
      </div>
      <div class="rep-kpi-card kpi-retorno">
        <div class="rep-kpi-value">${s.retorno}</div>
        <div class="rep-kpi-label">Pend. Retorno</div>
        <div class="rep-kpi-sub">Confirmar en Bit&aacute;cora</div>
      </div>
      <div class="rep-kpi-card kpi-mantenimiento">
        <div class="rep-kpi-value">${s.mantenimiento}</div>
        <div class="rep-kpi-label">Mantenimiento</div>
        <div class="rep-kpi-sub">En diagn&oacute;stico</div>
      </div>
      <div class="rep-kpi-card kpi-baja">
        <div class="rep-kpi-value">${s.baja}</div>
        <div class="rep-kpi-label">Dados de baja</div>
        <div class="rep-kpi-sub">Sin disponibilidad</div>
      </div>
    </div>

    <!-- Search -->
    <div class="table-toolbar">
      <div class="search-box" style="position:relative">
        <span class="search-icon">&#128270;</span>
        <input type="text" id="repStockSearch" placeholder="Buscar por tipo, marca, serie, PartNumber, c&oacute;digo..."
               value="${esc(_repStockSearch)}" oninput="_onRepStockSearch(this.value)">
        <span id="repStockSearchClear" onclick="_clearRepStockSearch()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;color:#94a3b8;font-size:16px;font-weight:700;width:24px;height:24px;display:${_repStockSearch ? 'flex' : 'none'};align-items:center;justify-content:center;border-radius:50%;transition:all .15s" onmouseover="this.style.background='#fee2e2';this.style.color='#dc2626'" onmouseout="this.style.background='';this.style.color='#94a3b8'" title="Limpiar b&uacute;squeda">&#10005;</span>
      </div>
    </div>
    <div id="repFiltersBar" style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap"></div>

    <!-- Status Tabs -->
    <div class="rep-tabs" id="repStockTabs">
      ${_buildRepStockTabs(s)}
    </div>

    <div id="repStockTableWrap" style="margin-top:0"></div>
  `;
  _renderRepFiltersBar();
  _renderRepStockTable();
}

/* ── Search helpers ── */
function _onRepStockSearch(val) {
  _repStockSearch = val;
  const cb = document.getElementById('repStockSearchClear');
  if (cb) cb.style.display = val ? 'flex' : 'none';
  _repStockPage = 1;
  debounceSearch('repStock', _renderRepStockTable);
}
function _clearRepStockSearch() {
  _repStockSearch = '';
  const input = document.getElementById('repStockSearch');
  if (input) { input.value = ''; input.focus(); }
  const cb = document.getElementById('repStockSearchClear');
  if (cb) cb.style.display = 'none';
  _repStockPage = 1;
  _renderRepStockTable();
}

/* ── Dynamic Filters Bar ── */
const _REP_FILTER_OPTIONS = [
  { key: 'categoria', label: 'Categoria' },
  { key: 'tipo',      label: 'Tipo' },
  { key: 'almacen',   label: 'Almacen' },
  { key: 'estadoUso', label: 'Estado Uso' },
  { key: 'marca',     label: 'Marca' }
];
let _repActiveFilters = {};
let _repFilterMenuOpen = false;

function _renderRepFiltersBar() {
  const bar = document.getElementById('repFiltersBar');
  if (!bar) return;
  const all = DB.get('repuestos');

  let html = Object.keys(_repActiveFilters).map(key => {
    const opt = _REP_FILTER_OPTIONS.find(o => o.key === key);
    if (!opt) return '';
    const values = ['Todos', ...new Set(all.map(r => (r[key] || r.equipo || '').toUpperCase()).filter(Boolean))].sort((a, b) => a === 'Todos' ? -1 : b === 'Todos' ? 1 : a.localeCompare(b));
    const current = _repActiveFilters[key] || 'Todos';
    return '<div style="display:flex;align-items:center;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;height:34px;background:#fff">'
      + '<select onchange="_repActiveFilters[\'' + key + '\']=this.value;_repStockPage=1;_renderRepStockTable()" style="border:none;padding:0 8px 0 10px;font-size:11px;color:#334155;height:100%;cursor:pointer;background:transparent;min-width:120px">'
      + values.map(v => '<option value="' + esc(v) + '" ' + (current === v ? 'selected' : '') + '>' + (v === 'Todos' ? esc(opt.label) + ': Todos' : esc(v)) + '</option>').join('')
      + '</select>'
      + '<button onclick="_repRemoveFilter(\'' + key + '\')" style="border:none;background:none;cursor:pointer;padding:0 6px;color:#94a3b8;font-size:14px;height:100%;display:flex;align-items:center" onmouseover="this.style.color=\'#dc2626\'" onmouseout="this.style.color=\'#94a3b8\'" title="Quitar filtro">&#10005;</button>'
      + '</div>';
  }).join('');

  const inactive = _REP_FILTER_OPTIONS.filter(o => !_repActiveFilters.hasOwnProperty(o.key));
  if (inactive.length > 0) {
    html += '<div id="repFilterAddWrap" style="position:relative;display:inline-block">'
      + '<button id="repFilterAddBtn" style="width:34px;height:34px;border-radius:8px;border:1px dashed #cbd5e1;background:#f8fafc;cursor:pointer;font-size:16px;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.borderColor=\'#2563eb\';this.style.color=\'#2563eb\'" onmouseout="this.style.borderColor=\'#cbd5e1\';this.style.color=\'#64748b\'" title="Agregar filtro">+</button>'
      + '<div id="repFilterAddMenu" style="display:' + (_repFilterMenuOpen ? 'block' : 'none') + ';position:absolute;top:38px;left:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:6px 0;z-index:999;min-width:200px">'
      + '<div style="padding:4px 12px 6px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Agregar filtro</div>'
      + inactive.map(o => '<div onclick="event.stopPropagation();_repAddFilter(\'' + o.key + '\')" style="padding:7px 12px;font-size:12px;color:#334155;cursor:pointer;display:flex;align-items:center;gap:8px" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'\'">'
        + '<span style="color:#2563eb;font-size:14px">+</span> ' + esc(o.label) + '</div>').join('')
      + '</div></div>';
  }

  bar.innerHTML = html;
  const addBtn = document.getElementById('repFilterAddBtn');
  if (addBtn) {
    addBtn.onclick = function(e) {
      e.stopPropagation();
      _repFilterMenuOpen = !_repFilterMenuOpen;
      const menu = document.getElementById('repFilterAddMenu');
      if (menu) menu.style.display = _repFilterMenuOpen ? 'block' : 'none';
    };
  }
}

function _repAddFilter(key) { _repActiveFilters[key] = 'Todos'; _repFilterMenuOpen = false; _repStockPage = 1; _renderRepFiltersBar(); _renderRepStockTable(); }
function _repRemoveFilter(key) { delete _repActiveFilters[key]; _repFilterMenuOpen = false; _repStockPage = 1; _renderRepFiltersBar(); _renderRepStockTable(); }

document.addEventListener('click', function(e) {
  if (_repFilterMenuOpen && !e.target.closest('#repFiltersBar')) {
    _repFilterMenuOpen = false;
    const m = document.getElementById('repFilterAddMenu');
    if (m) m.style.display = 'none';
  }
});

function _buildRepStockTabs(s) {
  const tabs = [
    { key: 'Todos', count: s.total, label: 'TODOS' },
    { key: 'DISPONIBLE', count: s.disponibles, label: 'DISPONIBLE' },
    { key: 'ASIGNADO', count: s.asignados, label: 'ASIGNADO' },
    { key: 'PENDIENTE_RETORNO', count: s.retorno, label: 'PEND. RETORNO' },
    { key: 'MANTENIMIENTO', count: s.mantenimiento, label: 'MANTENIMIENTO' },
    { key: 'BAJA', count: s.baja, label: 'BAJA' }
  ];
  return tabs.map(t =>
    '<button class="rep-tab' + (_repStockEstado === t.key ? ' active' : '') + '" onclick="_repStockEstado=\'' + t.key + '\';_repStockPage=1;_renderRepStockTable();_updateRepStockTabs()">'
    + '<span class="rep-tab-count">' + t.count + '</span>'
    + '<span class="rep-tab-label">' + t.label + '</span>'
    + '</button>'
  ).join('');
}

function _updateRepStockTabs() {
  const el = document.getElementById('repStockTabs');
  if (el) el.innerHTML = _buildRepStockTabs(_getRepStats());
}

function _getDispLabel(d) {
  if (d === 'PENDIENTE_RETORNO') return 'PEND. RETORNO';
  return d || 'DISPONIBLE';
}
function _getDispClass(d) {
  if (d === 'DISPONIBLE') return 'disponible';
  if (d === 'ASIGNADO') return 'asignado';
  if (d === 'PENDIENTE_RETORNO') return 'retorno';
  if (d === 'MANTENIMIENTO') return 'mantenimiento';
  if (d === 'BAJA') return 'baja';
  return 'disponible';
}
function _getEstadoCmdbClass(e) {
  if (!e) return '';
  const u = e.toUpperCase();
  if (u.includes('BUENO')) return 'bueno';
  if (u.includes('REGULAR')) return 'regular';
  if (u.includes('DIAGNOSTICO')) return 'diagnostico';
  if (u.includes('REPARACION')) return 'reparacion';
  if (u.includes('ESPERA')) return 'espera';
  if (u.includes('OBSOLETO')) return 'obsoleto';
  if (u.includes('DANADO') || u.includes('IRREPARABLE')) return 'danado';
  if (u.includes('PERDIDA') || u.includes('ROBO')) return 'perdida';
  if (u.includes('DESTRUIDO')) return 'destruido';
  return 'diagnostico';
}

function _renderRepStockTable() {
  const wrap = document.getElementById('repStockTableWrap');
  if (!wrap) return;
  let items = DB.get('repuestos');

  // Status tab filter
  if (_repStockEstado !== 'Todos') {
    items = items.filter(r => (r.estadoDisp || 'DISPONIBLE') === _repStockEstado);
  }
  // Dynamic filters from filter bar
  for (const [key, val] of Object.entries(_repActiveFilters)) {
    if (val && val !== 'Todos') {
      items = items.filter(r => {
        const field = key === 'tipo' ? (r.tipo || r.equipo || '') : (r[key] || '');
        return field.toUpperCase() === val.toUpperCase();
      });
    }
  }
  if (_repStockSearch) {
    const s = _repStockSearch.toLowerCase();
    items = items.filter(r =>
      (r.tipo || r.equipo || '').toLowerCase().includes(s) ||
      (r.marca || '').toLowerCase().includes(s) ||
      (r.modelo || '').toLowerCase().includes(s) ||
      (r.serie || '').toLowerCase().includes(s) ||
      (r.partNumber || '').toLowerCase().includes(s) ||
      (r.codigo || '').toLowerCase().includes(s) ||
      (r.almacen || '').toLowerCase().includes(s)
    );
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / _REP_STOCK_PAGE_SIZE));
  if (_repStockPage > totalPages) _repStockPage = totalPages;
  const start = (_repStockPage - 1) * _REP_STOCK_PAGE_SIZE;
  const pageData = items.slice(start, start + _REP_STOCK_PAGE_SIZE);

  let pageButtons = '';
  const maxVis = 5;
  let pS = Math.max(1, _repStockPage - Math.floor(maxVis / 2));
  let pE = Math.min(totalPages, pS + maxVis - 1);
  if (pE - pS < maxVis - 1) pS = Math.max(1, pE - maxVis + 1);
  pageButtons += '<button class="rep-page-btn" onclick="_repStockPage=1;_renderRepStockTable()" ' + (_repStockPage <= 1 ? 'disabled' : '') + '>&laquo;</button>';
  pageButtons += '<button class="rep-page-btn" onclick="_repStockPage--;_renderRepStockTable()" ' + (_repStockPage <= 1 ? 'disabled' : '') + '>&lsaquo;</button>';
  for (let p = pS; p <= pE; p++) {
    pageButtons += '<button class="rep-page-btn' + (p === _repStockPage ? ' active' : '') + '" onclick="_repStockPage=' + p + ';_renderRepStockTable()">' + p + '</button>';
  }
  pageButtons += '<button class="rep-page-btn" onclick="_repStockPage++;_renderRepStockTable()" ' + (_repStockPage >= totalPages ? 'disabled' : '') + '>&rsaquo;</button>';
  pageButtons += '<button class="rep-page-btn" onclick="_repStockPage=' + totalPages + ';_renderRepStockTable()" ' + (_repStockPage >= totalPages ? 'disabled' : '') + '>&raquo;</button>';

  const activos = DB.get('activos');

  wrap.innerHTML = `
    <div class="table-container" style="margin-top:0;border-top:none;border-radius:0 0 var(--radius) var(--radius)">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>C&Oacute;DIGO</th>
              <th>ALMAC&Eacute;N</th>
              <th>F. INGRESO</th>
              <th>CATEGOR&Iacute;A</th>
              <th>REPUESTO</th>
              <th>MARCA / MODELO</th>
              <th>CAPACIDAD</th>
              <th>SERIE</th>
              <th>PARTNUMBER</th>
              <th>ESTADO CMDB</th>
              <th>USO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            ${pageData.length === 0
              ? '<tr><td colspan="12"><div class="empty-state"><div class="empty-icon">&#128295;</div><h3>Sin repuestos</h3><p>No hay repuestos registrados</p></div></td></tr>'
              : pageData.map(r => {
                  const cat = (r.categoria || 'COMPONENTE').toUpperCase();
                  const disp = r.estadoDisp || 'DISPONIBLE';
                  const rowClass = disp === 'PENDIENTE_RETORNO' ? ' rep-row-retorno' : disp === 'BAJA' ? ' rep-row-baja' : disp === 'MANTENIMIENTO' ? ' rep-row-mant' : '';

                  // USO column: EN USO (if ASIGNADO) or PEND. RETORNO
                  let usoLabel = '', usoClass = '';
                  if (disp === 'ASIGNADO') { usoLabel = 'EN USO'; usoClass = 'asignado'; }
                  else if (disp === 'PENDIENTE_RETORNO') { usoLabel = 'PEND. RETORNO'; usoClass = 'retorno'; }

                  let actions = '<button class="btn-icon" title="Editar" onclick="event.stopPropagation();_openRepEditModal(' + r.id + ')" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-size:10px">&#9998;&#65039;</button>';
                  if (disp === 'DISPONIBLE') {
                    actions += '<button class="btn-icon" title="Eliminar" onclick="event.stopPropagation();_deleteRepuesto(' + r.id + ')" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;font-size:10px">&#128465;&#65039;</button>';
                  }
                  if (disp === 'PENDIENTE_RETORNO') {
                    actions += '<button class="btn-icon" title="Confirmar Retorno" onclick="event.stopPropagation();_openConfirmarRetorno(' + r.id + ')" style="background:#fefce8;color:#d97706;border:1px solid #fde68a;font-size:10px">&#8617;&#65039;</button>';
                  }

                  return '<tr class="' + rowClass + '">'
                    + '<td style="font-size:12px;font-weight:600;color:var(--accent);white-space:nowrap">' + esc(r.codigo || '') + '</td>'
                    + '<td style="font-size:12px">' + esc(r.almacen || '&mdash;') + '</td>'
                    + '<td style="font-size:11px;white-space:nowrap">' + (r.fechaIngreso ? formatDate(r.fechaIngreso) : '&mdash;') + '</td>'
                    + '<td><span class="rep-badge-cat ' + (cat === 'PARTE' ? 'parte' : 'comp') + '">' + (cat === 'PARTE' ? '&#128295; PARTE' : '&#9881;&#65039; COMP') + '</span></td>'
                    + '<td style="font-size:12px;font-weight:600">' + esc(r.tipo || r.equipo || '') + '</td>'
                    + '<td><div class="rep-marca-cell"><span class="marca-name">' + esc(r.marca || '') + '</span><span class="modelo-name">' + esc(r.modelo || '') + '</span></div></td>'
                    + '<td>' + ((r.capacidad) ? '<span class="rep-badge-cap">' + esc(r.capacidad) + '</span>' : '<span style="color:#94a3b8">&mdash;</span>') + '</td>'
                    + '<td style="font-size:11px;font-family:monospace;color:#475569">' + esc(r.serie || '&mdash;') + '</td>'
                    + '<td style="font-size:11px;font-family:monospace;color:#475569">' + esc(r.partNumber || '&mdash;') + '</td>'
                    + '<td><span class="rep-disp ' + _getDispClass(disp) + '">' + _getDispLabel(disp) + '</span></td>'
                    + '<td>' + (usoLabel ? '<span class="rep-disp ' + usoClass + '">' + usoLabel + '</span>' : '<span style="color:#94a3b8">&mdash;</span>') + '</td>'
                    + '<td><div class="action-btns">' + actions + '</div></td>'
                    + '</tr>';
                }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="rep-pagination">
      <span>${start + 1}&ndash;${Math.min(start + _REP_STOCK_PAGE_SIZE, total)} de ${total} repuestos</span>
      <div class="rep-pages">${pageButtons}</div>
    </div>
  `;
}

function _exportRepuestos() {
  const items = DB.get('repuestos');
  if (items.length === 0) { showToast('No hay repuestos para exportar', 'error'); return; }
  const headers = ['CODIGO','CATEGORIA','TIPO','CAPACIDAD','MARCA','MODELO','SERIE','PARTNUMBER','SKU','ESTADO_USO','ESTADO_DISP','ESTADO_CMDB','ACTIVO_ASIGNADO','ALMACEN','F_INGRESO','OBSERVACIONES'];
  const activos = DB.get('activos');
  const rows = items.map(r => {
    const activo = r.activoAsignadoId ? activos.find(a => a.id === r.activoAsignadoId) : null;
    return [r.codigo||'', r.categoria||'', r.tipo||r.equipo||'', r.capacidad||'', r.marca||'', r.modelo||'', r.serie||'', r.partNumber||'', r.sku||'', r.estadoUso||'', r.estadoDisp||'', r.estadoCMDB||'', activo?activo.codigo:'', r.almacen||'', r.fechaIngreso||'', r.observaciones||''];
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Repuestos');
  XLSX.writeFile(wb, 'Repuestos_Export.xlsx');
  showToast('Exportado correctamente');
}

/* ── Edit Modal ── */
function _openRepEditModal(id) {
  const repuestos = DB.get('repuestos');
  const r = repuestos.find(x => x.id === id);
  if (!r) return;
  const marcas = DB.getConfig('marcas', []);
  const ubicaciones = DB.getConfig('ubicaciones', []);
  const isComp = (r.categoria || '').toUpperCase() === 'COMPONENTE';
  const tiposForCat = isComp ? _REP_COMP_TIPOS : _REP_PARTE_TIPOS;
  const curTipo = (r.tipo || r.equipo || '').toUpperCase();
  const curMarca = (r.marca || '').toUpperCase();
  const curCap = (r.capacidad || '').toUpperCase();
  const curAlm = (r.almacen || '').toUpperCase();

  // Build tipo options - include current value even if not in predefined list
  const tipoOpts = [...tiposForCat];
  if (curTipo && !tipoOpts.some(t => t.toUpperCase() === curTipo)) tipoOpts.push(curTipo);

  // Build marca options - include current value even if not in config
  const marcaOpts = [...marcas];
  if (curMarca && !marcaOpts.some(m => m.toUpperCase() === curMarca)) marcaOpts.push(curMarca);

  // Build almacen options - include current value even if not in config
  const almOpts = [...ubicaciones];
  if (curAlm && !almOpts.some(a => a.toUpperCase() === curAlm)) almOpts.push(curAlm);

  openModal('Editar Repuesto — ' + esc(r.codigo), `
    <div class="form-grid-3">
      <div class="form-group">
        <label>Categor&iacute;a</label>
        <input class="form-control" value="${esc(r.categoria || '')}" readonly style="background:#f1f5f9;font-weight:600">
      </div>
      <div class="form-group">
        <label>Tipo <span class="required">*</span></label>
        <select class="form-control" id="fRepEditTipo">
          ${tipoOpts.map(t => '<option value="' + esc(t) + '"' + (t.toUpperCase() === curTipo ? ' selected' : '') + '>' + esc(t) + '</option>').join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Marca <span class="required">*</span></label>
        <select class="form-control" id="fRepEditMarca">
          <option value="">Seleccionar...</option>
          ${marcaOpts.map(m => '<option value="' + esc(m) + '"' + (m.toUpperCase() === curMarca ? ' selected' : '') + '>' + esc(m) + '</option>').join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Modelo <span class="required">*</span></label>
        <input class="form-control" id="fRepEditModelo" value="${esc(r.modelo || '')}">
      </div>
      ${isComp ? '<div class="form-group"><label>Capacidad <span class="required">*</span></label><select class="form-control" id="fRepEditCap">' + _REP_CAPACIDADES.map(c => '<option value="' + esc(c) + '"' + (c.toUpperCase() === curCap ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div>' : ''}
      <div class="form-group">
        <label>N&deg; Serie</label>
        <input class="form-control" id="fRepEditSerie" value="${esc(r.serie || '')}">
      </div>
      <div class="form-group">
        <label>PartNumber</label>
        <input class="form-control" id="fRepEditPN" value="${esc(r.partNumber || '')}">
      </div>
      <div class="form-group">
        <label>SKU</label>
        <input class="form-control" id="fRepEditSku" value="${esc(r.sku || '')}">
      </div>
      <div class="form-group">
        <label>Estado de Uso</label>
        <select class="form-control" id="fRepEditUso">
          <option value="NUEVO" ${(r.estadoUso||'NUEVO') === 'NUEVO' ? 'selected' : ''}>Nuevo</option>
          <option value="USADO" ${r.estadoUso === 'USADO' ? 'selected' : ''}>Usado</option>
        </select>
      </div>
      <div class="form-group">
        <label>Almac&eacute;n</label>
        <select class="form-control" id="fRepEditAlmacen">
          <option value="">Seleccionar...</option>
          ${almOpts.map(a => '<option value="' + esc(a) + '"' + (a.toUpperCase() === curAlm ? ' selected' : '') + '>' + esc(a) + '</option>').join('')}
        </select>
      </div>
      <div class="form-group span2">
        <label>Observaciones</label>
        <input class="form-control" id="fRepEditObs" value="${esc(r.observaciones || '')}">
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_saveRepEdit(${id})">&#128190; Actualizar</button>
  `, 'modal-lg');
}

function _saveRepEdit(id) {
  const repuestos = DB.get('repuestos');
  const idx = repuestos.findIndex(r => r.id === id);
  if (idx < 0) return;
  const r = repuestos[idx];
  const isComp = (r.categoria || '').toUpperCase() === 'COMPONENTE';

  const tipo = (document.getElementById('fRepEditTipo') || {}).value;
  const marca = (document.getElementById('fRepEditMarca') || {}).value;
  const modelo = (document.getElementById('fRepEditModelo') || {}).value.trim();
  const serie = (document.getElementById('fRepEditSerie') || {}).value.trim();
  const capacidad = isComp ? (document.getElementById('fRepEditCap') || {}).value : (r.capacidad || '');

  if (!tipo || !marca || !modelo) { showToast('Completa Tipo, Marca y Modelo', 'error'); return; }
  if (isComp && !serie) { showToast('Serie obligatoria para componentes', 'error'); return; }
  if (isComp && !capacidad) { showToast('Capacidad obligatoria para componentes', 'error'); return; }

  Object.assign(repuestos[idx], upperFields({
    tipo, equipo: tipo, capacidad, marca, modelo, serie,
    partNumber: (document.getElementById('fRepEditPN') || {}).value.trim(),
    sku: (document.getElementById('fRepEditSku') || {}).value.trim(),
    estadoUso: (document.getElementById('fRepEditUso') || {}).value,
    almacen: (document.getElementById('fRepEditAlmacen') || {}).value,
    observaciones: (document.getElementById('fRepEditObs') || {}).value.trim()
  }));

  DB.set('repuestos', repuestos);
  addMovimiento('EDICION REPUESTO', 'Repuesto ' + r.codigo + ' actualizado');
  closeModal();
  showToast('Repuesto actualizado');
  _renderRepStock();
}

function _deleteRepuesto(id) {
  const repuestos = DB.get('repuestos');
  const r = repuestos.find(x => x.id === id);
  if (!r) return;
  if (r.estadoDisp && r.estadoDisp !== 'DISPONIBLE') { showToast('Solo se pueden eliminar repuestos disponibles', 'error'); return; }

  let msgConfirm = `¿Eliminar el repuesto ${r.codigo}?`;
  if (r.activoAsignadoId) {
    const activos = DB.get('activos');
    const actVinculado = activos.find(a => a.id === r.activoAsignadoId);
    msgConfirm += `\n\n⚠️ Este repuesto está vinculado al activo ${actVinculado ? actVinculado.codigo : r.activoAsignadoId}. Será desvinculado.`;
  }
  msgConfirm += '\n\nEsta acción NO se puede deshacer.';
  if (!confirm(msgConfirm)) return;
  if (!confirm('⚠️ SEGUNDA CONFIRMACIÓN: ¿Realmente desea eliminar este repuesto?')) return;

  // Limpiar asignaciones de repuestos relacionadas
  const asigRep = DB.get('asignacionesRep');
  DB.set('asignacionesRep', asigRep.filter(ar => ar.repuestoId !== id));

  DB.set('repuestos', repuestos.filter(x => x.id !== id));
  addMovimiento('ELIMINACION REPUESTO', 'Repuesto ' + r.codigo + ' eliminado');
  showToast('Repuesto eliminado');
  _renderRepStock();
}

/* ── Confirmar Retorno Modal ── */
let _retornoState = { estadoGrupo: '', subEstado: '' };

function _openConfirmarRetorno(id) {
  _retornoState = { estadoGrupo: '', subEstado: '' };
  const repuestos = DB.get('repuestos');
  const r = repuestos.find(x => x.id === id);
  if (!r) return;
  const activos = DB.get('activos');
  const activo = r.activoAsignadoId ? activos.find(a => a.id === r.activoAsignadoId) : null;
  const ubicaciones = DB.getConfig('ubicaciones', []);

  openModal('Confirmar Retorno &mdash; ' + esc(r.codigo), `
    <div id="retornoModalBody" data-rep-id="${id}">
      ${_buildRetornoBody(r, activo, ubicaciones)}
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" id="btnConfirmarRetorno" onclick="_confirmarRetorno(${id})" disabled>&#10003; Confirmar Retorno</button>
  `, 'modal-lg');
}

function _buildRetornoBody(r, activo, ubicaciones) {
  const g = _retornoState.estadoGrupo;
  const sub = _retornoState.subEstado;
  const subEstados = g ? (_REP_ESTADOS_CMDB[g] || []) : [];

  let previewHtml = '';
  if (g && sub) {
    const colors = { DISPONIBLE: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' }, MANTENIMIENTO: { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6' }, BAJA: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' } };
    const c = colors[g] || colors.DISPONIBLE;
    previewHtml = '<div class="rep-preview-result" style="background:' + c.bg + ';border:1px solid ' + c.border + ';color:' + c.text + '">Resultado: <strong>' + g + '</strong> &rarr; ' + sub + '</div>';
  }

  return `
    <div class="rep-retorno-info">
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div><strong>C&oacute;digo:</strong> ${esc(r.codigo)}</div>
        <div><strong>Tipo:</strong> ${esc(r.tipo || r.equipo || '')}</div>
        <div><strong>Marca:</strong> ${esc(r.marca)} ${esc(r.modelo)}</div>
        <div><strong>Serie:</strong> ${esc(r.serie || '&mdash;')}</div>
        ${activo ? '<div><strong>Activo:</strong> ' + esc(activo.codigo) + '</div>' : ''}
      </div>
    </div>

    <div class="form-grid-3" style="margin-bottom:20px">
      <div class="form-group">
        <label>Ticket <span class="required">*</span></label>
        <input class="form-control" id="fRetornoTicket" placeholder="N&uacute;mero de ticket">
      </div>
      <div class="form-group">
        <label>Fecha confirmaci&oacute;n</label>
        <input type="date" class="form-control" id="fRetornoFecha" value="${today()}">
      </div>
      <div class="form-group">
        <label>Almac&eacute;n de ingreso <span class="required">*</span></label>
        <select class="form-control" id="fRetornoAlmacen">
          <option value="">Seleccionar...</option>
          ${optionsHTML(ubicaciones, '')}
        </select>
      </div>
    </div>

    <div style="margin-bottom:12px"><label style="font-weight:700;font-size:13px">Estado CMDB <span class="required">*</span></label></div>
    <div class="rep-retorno-cards">
      <div class="rep-retorno-card${g === 'DISPONIBLE' ? ' sel-disp' : ''}" onclick="_retornoSelectGrupo('DISPONIBLE', ${r.id})">
        <div class="rc-icon">&#9989;</div>
        <div class="rc-label">DISPONIBLE</div>
      </div>
      <div class="rep-retorno-card${g === 'MANTENIMIENTO' ? ' sel-mant' : ''}" onclick="_retornoSelectGrupo('MANTENIMIENTO', ${r.id})">
        <div class="rc-icon">&#128295;</div>
        <div class="rc-label">MANTENIMIENTO</div>
      </div>
      <div class="rep-retorno-card${g === 'BAJA' ? ' sel-baja' : ''}" onclick="_retornoSelectGrupo('BAJA', ${r.id})">
        <div class="rc-icon">&#128683;</div>
        <div class="rc-label">BAJA</div>
      </div>
    </div>

    ${subEstados.length > 0 ? `
    <div style="margin-bottom:8px"><label style="font-weight:600;font-size:12px;color:var(--text-secondary)">Sub-estado:</label></div>
    <div class="rep-sub-estados">
      ${subEstados.map(s => '<button class="rep-sub-estado' + (sub === s ? ' active' : '') + '" onclick="_retornoSelectSub(\'' + esc(s) + '\', ' + r.id + ')">' + esc(s) + '</button>').join('')}
    </div>` : ''}

    ${previewHtml}

    <div class="form-group">
      <label>Observaciones</label>
      <input class="form-control" id="fRetornoObs" placeholder="Observaciones del retorno">
    </div>
  `;
}

function _retornoSelectGrupo(grupo, repId) {
  _retornoState.estadoGrupo = grupo;
  _retornoState.subEstado = '';
  _refreshRetornoModal(repId);
}

function _retornoSelectSub(sub, repId) {
  _retornoState.subEstado = sub;
  _refreshRetornoModal(repId);
}

function _refreshRetornoModal(repId) {
  const repuestos = DB.get('repuestos');
  const r = repuestos.find(x => x.id === repId);
  if (!r) return;
  const activos = DB.get('activos');
  const activo = r.activoAsignadoId ? activos.find(a => a.id === r.activoAsignadoId) : null;
  const ubicaciones = DB.getConfig('ubicaciones', []);

  const ticket = (document.getElementById('fRetornoTicket') || {}).value;
  const fecha = (document.getElementById('fRetornoFecha') || {}).value;
  const almacen = (document.getElementById('fRetornoAlmacen') || {}).value;
  const obs = (document.getElementById('fRetornoObs') || {}).value;

  const body = document.getElementById('retornoModalBody');
  if (body) body.innerHTML = _buildRetornoBody(r, activo, ubicaciones);

  const tEl = document.getElementById('fRetornoTicket'); if (tEl) tEl.value = ticket;
  const fEl = document.getElementById('fRetornoFecha'); if (fEl) fEl.value = fecha;
  const aEl = document.getElementById('fRetornoAlmacen'); if (aEl) aEl.value = almacen;
  const oEl = document.getElementById('fRetornoObs'); if (oEl) oEl.value = obs;

  const btn = document.getElementById('btnConfirmarRetorno');
  if (btn) btn.disabled = !(_retornoState.estadoGrupo && _retornoState.subEstado);
}

function _confirmarRetorno(id) {
  const g = _retornoState.estadoGrupo;
  const sub = _retornoState.subEstado;
  if (!g || !sub) { showToast('Selecciona estado CMDB y sub-estado', 'error'); return; }

  const ticket = (document.getElementById('fRetornoTicket') || {}).value.trim();
  const almacen = (document.getElementById('fRetornoAlmacen') || {}).value;
  if (!ticket) { showToast('El ticket es obligatorio', 'error'); return; }
  if (!almacen) { showToast('El almacen de ingreso es obligatorio', 'error'); return; }

  const repuestos = DB.get('repuestos');
  const idx = repuestos.findIndex(r => r.id === id);
  if (idx < 0) return;
  const r = repuestos[idx];

  repuestos[idx].estadoDisp = g;
  repuestos[idx].estadoCMDB = sub;
  repuestos[idx].estadoUso = 'USADO';
  repuestos[idx].activoAsignadoId = null;
  repuestos[idx].almacen = almacen.toUpperCase();
  repuestos[idx].observaciones = (document.getElementById('fRetornoObs') || {}).value.trim();
  DB.set('repuestos', repuestos);

  const detalle = 'Retorno ' + r.codigo + ' (' + (r.tipo || r.equipo) + ' ' + (r.capacidad || '') + ' ' + r.marca + ') | Ticket: ' + ticket + ' | Almacen: ' + almacen + ' | Estado: ' + g + ' - ' + sub;
  addMovimiento('RETORNO REPUESTO', detalle);
  closeModal();
  showToast('Retorno confirmado: ' + r.codigo + ' &rarr; ' + g);
  _renderRepStock();
}

/* ── Helper: generar serie ── */
function _generarSerieRepuesto(equipo) {
  const prefijo = 'REP-' + _generarPrefijo(equipo || 'REP');
  const repuestos = DB.get('repuestos');
  let maxNum = 0;
  repuestos.forEach(r => {
    if ((r.serie || '').toUpperCase().startsWith(prefijo)) {
      const num = parseInt((r.serie || '').substring(prefijo.length)) || 0;
      if (num > maxNum) maxNum = num;
    }
  });
  return prefijo + String(maxNum + 1).padStart(5, '0');
}

/* ═══════════════════════════════════════════════════════
   ASIGNACION DE REPUESTOS
   ═══════════════════════════════════════════════════════ */
let _arSearch = '';
let _arPage = 1;
const _AR_PAGE_SIZE = 15;
let _arFilterMotivo = 'Todos';
let _arFilterCat = 'Todos';
let _arFilterEstado = 'Todos';

function _getArStats() {
  const all = DB.get('asignacionesRep');
  return {
    total: all.length,
    vigentes: all.filter(a => a.estado === 'VIGENTE').length,
    pendRetorno: all.filter(a => a.estado === 'PEND. RETORNO').length,
    revertidas: all.filter(a => a.estado === 'REVERTIDA').length
  };
}

function renderAsignacionRepuestos(el) {
  const s = _getArStats();
  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Asignaci&oacute;n de Repuestos</h1>
        <div class="subtitle">Ampliaci&oacute;n &middot; Reemplazo &middot; Repliegue de componentes y partes</div>
      </div>
      <div style="display:flex;gap:8px">
        ${s.pendRetorno > 0 ? '<button class="ar-pend-btn" onclick="_arFilterEstado=\'PEND. RETORNO\';_arPage=1;renderAsignacionRepuestos(document.getElementById(\'contentArea\'))">&#128230; Pendientes Retorno <span class="ar-pend-count">' + s.pendRetorno + '</span></button>' : ''}
        <button class="btn btn-primary" onclick="_openNuevaAsigRepModal()">+ Nueva Asignaci&oacute;n</button>
      </div>
    </div>

    <div class="ar-kpi-grid">
      <div class="ar-kpi-card ar-total">
        <div class="ar-kpi-value">${s.total}</div>
        <div class="ar-kpi-label">Total asignaciones</div>
      </div>
      <div class="ar-kpi-card ar-vigente">
        <div class="ar-kpi-value" style="color:#10b981">${s.vigentes}</div>
        <div class="ar-kpi-label">Vigentes</div>
      </div>
      <div class="ar-kpi-card ar-pend">
        <div class="ar-kpi-value" style="color:#f59e0b">${s.pendRetorno}</div>
        <div class="ar-kpi-label">Pend. Retorno componente</div>
      </div>
      <div class="ar-kpi-card ar-revertida">
        <div class="ar-kpi-value" style="color:#8b5cf6">${s.revertidas}</div>
        <div class="ar-kpi-label">Revertidas</div>
      </div>
    </div>

    <div class="table-toolbar">
      <div class="search-box" style="position:relative">
        <span class="search-icon">&#128270;</span>
        <input type="text" id="arSearchInput" placeholder="Buscar por activo, repuesto, ticket, serie..."
               value="${esc(_arSearch)}" oninput="_arSearch=this.value;_arPage=1;_renderArTable()">
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="form-control" style="width:auto;min-width:130px;height:38px;font-size:13px" onchange="_arFilterMotivo=this.value;_arPage=1;_renderArTable()">
          <option value="Todos"${_arFilterMotivo==='Todos'?' selected':''}>Motivo: Todos</option>
          <option value="AMPLIACION"${_arFilterMotivo==='AMPLIACION'?' selected':''}>Ampliaci&oacute;n</option>
          <option value="REEMPLAZO"${_arFilterMotivo==='REEMPLAZO'?' selected':''}>Reemplazo</option>
          <option value="REPLIEGUE"${_arFilterMotivo==='REPLIEGUE'?' selected':''}>Repliegue</option>
        </select>
        <select class="form-control" style="width:auto;min-width:140px;height:38px;font-size:13px" onchange="_arFilterCat=this.value;_arPage=1;_renderArTable()">
          <option value="Todos"${_arFilterCat==='Todos'?' selected':''}>Categor&iacute;a: Todos</option>
          <option value="COMPONENTE"${_arFilterCat==='COMPONENTE'?' selected':''}>Componente</option>
          <option value="PARTE"${_arFilterCat==='PARTE'?' selected':''}>Parte</option>
        </select>
        <select class="form-control" style="width:auto;min-width:130px;height:38px;font-size:13px" onchange="_arFilterEstado=this.value;_arPage=1;_renderArTable()">
          <option value="Todos"${_arFilterEstado==='Todos'?' selected':''}>Estado: Todos</option>
          <option value="VIGENTE"${_arFilterEstado==='VIGENTE'?' selected':''}>Vigente</option>
          <option value="PEND. RETORNO"${_arFilterEstado==='PEND. RETORNO'?' selected':''}>Pend. Retorno</option>
          <option value="REVERTIDA"${_arFilterEstado==='REVERTIDA'?' selected':''}>Revertida</option>
        </select>
        <button class="btn" onclick="_exportAsigRep()" style="height:38px;font-size:13px;border:1px solid var(--border)">&#128203; Exportar</button>
      </div>
    </div>

    <div id="arTableWrap"></div>
  `;
  _renderArTable();
}

function _renderArTable() {
  const wrap = document.getElementById('arTableWrap');
  if (!wrap) return;
  let items = DB.get('asignacionesRep');

  if (_arFilterMotivo !== 'Todos') items = items.filter(a => a.motivo === _arFilterMotivo);
  if (_arFilterCat !== 'Todos') items = items.filter(a => (a.categoria || '').toUpperCase() === _arFilterCat);
  if (_arFilterEstado !== 'Todos') items = items.filter(a => a.estado === _arFilterEstado);
  if (_arSearch) {
    const s = _arSearch.toLowerCase();
    items = items.filter(a =>
      (a.activoCodigo || '').toLowerCase().includes(s) ||
      (a.repuestoDesc || '').toLowerCase().includes(s) ||
      (a.ticket || '').toLowerCase().includes(s) ||
      (a.serie || '').toLowerCase().includes(s) ||
      (a.repuestoCodigo || '').toLowerCase().includes(s) ||
      String(a.id || '').includes(s)
    );
  }

  // Sort by date desc
  items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / _AR_PAGE_SIZE));
  if (_arPage > totalPages) _arPage = totalPages;
  const start = (_arPage - 1) * _AR_PAGE_SIZE;
  const pageData = items.slice(start, start + _AR_PAGE_SIZE);

  let pageButtons = '';
  const maxVis = 5;
  let pS = Math.max(1, _arPage - Math.floor(maxVis / 2));
  let pE = Math.min(totalPages, pS + maxVis - 1);
  if (pE - pS < maxVis - 1) pS = Math.max(1, pE - maxVis + 1);
  pageButtons += '<button class="rep-page-btn" onclick="_arPage=1;_renderArTable()" ' + (_arPage<=1?'disabled':'') + '>&laquo;</button>';
  pageButtons += '<button class="rep-page-btn" onclick="_arPage--;_renderArTable()" ' + (_arPage<=1?'disabled':'') + '>&lsaquo;</button>';
  for (let p = pS; p <= pE; p++) pageButtons += '<button class="rep-page-btn' + (p===_arPage?' active':'') + '" onclick="_arPage='+p+';_renderArTable()">'+p+'</button>';
  pageButtons += '<button class="rep-page-btn" onclick="_arPage++;_renderArTable()" ' + (_arPage>=totalPages?'disabled':'') + '>&rsaquo;</button>';
  pageButtons += '<button class="rep-page-btn" onclick="_arPage='+totalPages+';_renderArTable()" ' + (_arPage>=totalPages?'disabled':'') + '>&raquo;</button>';

  wrap.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>FECHA</th>
              <th>CATEGOR&Iacute;A</th>
              <th>REPUESTO</th>
              <th>SERIE</th>
              <th>MOTIVO</th>
              <th>USO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            ${pageData.length === 0
              ? '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">&#128279;</div><h3>Sin asignaciones</h3><p>No hay asignaciones de repuestos registradas</p></div></td></tr>'
              : pageData.map(a => {
                  const cat = (a.categoria || '').toUpperCase();
                  const isPend = a.estado === 'PEND. RETORNO';
                  const mClass = a.motivo === 'AMPLIACION' ? 'ampliacion' : a.motivo === 'REEMPLAZO' ? 'reemplazo' : 'repliegue';
                  const eClass = a.estado === 'VIGENTE' ? 'vigente' : isPend ? 'pend-retorno' : 'revertida';

                  let actions = '<button class="btn-icon" title="Ver detalle" onclick="_verDetalleAsigRep(' + a.id + ')" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-size:10px">&#128196;</button>';
                  if (isPend) {
                    actions += '<button class="btn btn-sm" onclick="_confirmarRetornoAsigRep(' + a.id + ')" style="font-size:11px;padding:4px 10px;background:#fefce8;border:1px solid #fde68a;color:#92400e;cursor:pointer;font-weight:600">&#8617; Confirmar</button>';
                  }
                  if (a.estado === 'VIGENTE') {
                    actions += '<button class="btn-icon" title="Revertir" onclick="_revertirAsigRep(' + a.id + ')" style="background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;font-size:10px">&#8634;</button>';
                  }

                  return '<tr class="' + (isPend ? 'ar-row-pend' : '') + '">'
                    + '<td style="font-size:12px;font-weight:600;color:var(--accent)">' + a.id + '</td>'
                    + '<td style="font-size:11px;white-space:nowrap">' + (a.fecha ? formatDate(a.fecha) : '&mdash;') + '</td>'
                    + '<td><span class="rep-badge-cat ' + (cat==='PARTE'?'parte':'comp') + '">' + (cat==='PARTE'?'&#128295; PARTE':'&#9881;&#65039; COMP') + '</span></td>'
                    + '<td><div class="ar-rep-desc"><span class="ar-rep-name">' + esc(a.repuestoTipo || '') + '</span><span class="ar-rep-detail">' + esc(a.repuestoDesc || '') + '</span></div></td>'
                    + '<td style="font-size:11px;font-family:monospace;color:#475569">' + esc(a.serie || '&mdash;') + '</td>'
                    + '<td><span class="ar-motivo-badge ' + mClass + '">' + (a.motivo==='AMPLIACION'?'+ AMPLIACI&Oacute;N':a.motivo==='REEMPLAZO'?'&#128260; REEMPLAZO':'&#128230; REPLIEGUE') + '</span></td>'
                    + '<td><span class="ar-estado-badge ' + eClass + '">' + esc(a.estado) + '</span></td>'
                    + '<td><div class="action-btns">' + actions + '</div></td>'
                    + '</tr>';
                }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="rep-pagination">
      <span>${start+1}&ndash;${Math.min(start+_AR_PAGE_SIZE,total)} de ${total} asignaciones</span>
      <div class="rep-pages">${pageButtons}</div>
    </div>
  `;
}

/* ── Nueva Asignacion Modal ── */
// Variables de modal eliminadas — se lee directamente del DOM

function _openNuevaAsigRepModal() {
  // Estado se lee directamente del DOM al guardar

  const repuestos = DB.get('repuestos').filter(r => (r.estadoDisp || 'DISPONIBLE') === 'DISPONIBLE');
  const activos = DB.get('activos').filter(a => a.estado === 'Asignado' || a.estado === 'Disponible');

  openModal('Nueva Asignaci&oacute;n de Repuesto', `
    <div id="arModalBody">
      <div class="form-grid-3">
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" class="form-control" id="fArFecha" value="${today()}">
        </div>
        <div class="form-group">
          <label>Ticket <span class="required">*</span></label>
          <input class="form-control" id="fArTicket" placeholder="N&uacute;mero de ticket">
        </div>
        <div class="form-group">
          <label>Motivo <span class="required">*</span></label>
          <select class="form-control" id="fArMotivo">
            <option value="">Seleccionar...</option>
            <option value="AMPLIACION">Ampliaci&oacute;n</option>
            <option value="REEMPLAZO">Reemplazo</option>
            <option value="REPLIEGUE">Repliegue</option>
          </select>
        </div>
      </div>
      <div class="form-grid-3" style="margin-top:16px">
        <div class="form-group">
          <label>Activo destino <span class="required">*</span></label>
          <select class="form-control" id="fArActivo">
            <option value="">Seleccionar activo...</option>
            ${activos.map(a => '<option value="'+a.id+'">'+esc(a.codigo)+' - '+esc(a.marca)+' '+esc(a.modelo)+'</option>').join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Repuesto a asignar <span class="required">*</span></label>
          <select class="form-control" id="fArRepuesto">
            <option value="">Seleccionar repuesto...</option>
            ${repuestos.map(r => '<option value="'+r.id+'">'+esc(r.codigo)+' - '+esc(r.tipo||r.equipo)+' '+esc(r.marca)+' '+esc(r.modelo)+(r.capacidad?' '+esc(r.capacidad):'')+'</option>').join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Observaciones</label>
          <input class="form-control" id="fArObs" placeholder="Opcional">
        </div>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_saveAsigRep()">&#128190; Registrar Asignaci&oacute;n</button>
  `, 'modal-lg');
}

function _saveAsigRep() {
  const ticket = (document.getElementById('fArTicket')||{}).value.trim();
  const motivo = (document.getElementById('fArMotivo')||{}).value;
  const activoId = parseInt((document.getElementById('fArActivo') || {}).value) || null;
  const repId = parseInt((document.getElementById('fArRepuesto') || {}).value) || null;
  const fecha = (document.getElementById('fArFecha')||{}).value || today();
  const obs = (document.getElementById('fArObs')||{}).value.trim();

  if (!ticket) { showToast('El ticket es obligatorio', 'error'); return; }
  if (!motivo) { showToast('Selecciona un motivo', 'error'); return; }
  if (!activoId) { showToast('Selecciona un activo destino', 'error'); return; }
  if (!repId) { showToast('Selecciona un repuesto', 'error'); return; }

  const repuestos = DB.get('repuestos');
  const rep = repuestos.find(r => r.id === repId);
  if (!rep) { showToast('Repuesto no encontrado', 'error'); return; }

  const activos = DB.get('activos');
  const activo = activos.find(a => a.id === activoId);
  if (!activo) { showToast('Activo no encontrado', 'error'); return; }

  const asigs = DB.get('asignacionesRep');
  const newId = nextId(asigs);

  const repDesc = [rep.marca, rep.modelo, rep.capacidad].filter(Boolean).join(' ');
  let estado = 'VIGENTE';
  if (motivo === 'REPLIEGUE') estado = 'VIGENTE';

  asigs.push({
    id: newId,
    fecha,
    ticket: ticket.toUpperCase(),
    motivo,
    activoId,
    activoCodigo: activo.codigo,
    repuestoId: rep.id,
    repuestoCodigo: rep.codigo,
    categoria: rep.categoria || 'COMPONENTE',
    repuestoTipo: rep.tipo || rep.equipo || '',
    repuestoDesc: repDesc,
    serie: rep.serie || '',
    estado,
    observaciones: obs
  });
  DB.set('asignacionesRep', asigs);

  // Update repuesto status
  const rIdx = repuestos.findIndex(r => r.id === repId);
  if (rIdx >= 0) {
    if (motivo === 'REPLIEGUE') {
      repuestos[rIdx].estadoDisp = 'PENDIENTE_RETORNO';
      repuestos[rIdx].activoAsignadoId = activoId;
    } else {
      repuestos[rIdx].estadoDisp = 'ASIGNADO';
      repuestos[rIdx].activoAsignadoId = activoId;
    }
    DB.set('repuestos', repuestos);
  }

  addMovimiento('ASIGNACION REPUESTO', rep.codigo + ' (' + (rep.tipo||rep.equipo) + ' ' + repDesc + ') -> ' + activo.codigo + ' | Motivo: ' + motivo + ' | Ticket: ' + ticket);
  closeModal();
  showToast('Asignacion registrada');
  renderAsignacionRepuestos(document.getElementById('contentArea'));
}

/* ── Ver Detalle ── */
function _verDetalleAsigRep(id) {
  const asigs = DB.get('asignacionesRep');
  const a = asigs.find(x => x.id === id);
  if (!a) return;

  const mClass = a.motivo === 'AMPLIACION' ? 'ampliacion' : a.motivo === 'REEMPLAZO' ? 'reemplazo' : 'repliegue';
  const eClass = a.estado === 'VIGENTE' ? 'vigente' : a.estado === 'PEND. RETORNO' ? 'pend-retorno' : 'revertida';

  openModal('Detalle Asignaci&oacute;n #' + a.id, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><strong>Fecha:</strong> ${a.fecha ? formatDate(a.fecha) : '&mdash;'}</div>
      <div><strong>Ticket:</strong> ${esc(a.ticket || '')}</div>
      <div><strong>Motivo:</strong> <span class="ar-motivo-badge ${mClass}">${esc(a.motivo)}</span></div>
      <div><strong>Estado:</strong> <span class="ar-estado-badge ${eClass}">${esc(a.estado)}</span></div>
      <div><strong>Activo:</strong> ${esc(a.activoCodigo || '')}</div>
      <div><strong>Categor&iacute;a:</strong> ${esc(a.categoria || '')}</div>
    </div>
    <div style="background:#f8fafc;border-radius:var(--radius);padding:16px;margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:8px">Repuesto</div>
      <div><strong>C&oacute;digo:</strong> ${esc(a.repuestoCodigo || '')}</div>
      <div><strong>Tipo:</strong> ${esc(a.repuestoTipo || '')}</div>
      <div><strong>Detalle:</strong> ${esc(a.repuestoDesc || '')}</div>
      <div><strong>Serie:</strong> ${esc(a.serie || '')}</div>
    </div>
    ${a.observaciones ? '<div><strong>Observaciones:</strong> ' + esc(a.observaciones) + '</div>' : ''}
  `, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

/* ── Confirmar Retorno ── */
function _confirmarRetornoAsigRep(id) {
  const asigs = DB.get('asignacionesRep');
  const a = asigs.find(x => x.id === id);
  if (!a || a.estado !== 'PEND. RETORNO') return;

  // Open the repuesto's confirmar retorno modal
  const rep = DB.get('repuestos').find(r => r.id === a.repuestoId);
  if (rep) {
    _openConfirmarRetorno(rep.id);
    // After confirming retorno on the repuesto, also update asig status
    const origConfirm = window._confirmarRetorno;
    // We'll update asig status via a post-action
  }
}

/* ── Revertir ── */
function _revertirAsigRep(id) {
  if (!confirm('Revertir esta asignacion? El repuesto volvera a estar disponible.')) return;
  const asigs = DB.get('asignacionesRep');
  const idx = asigs.findIndex(x => x.id === id);
  if (idx < 0) return;
  const a = asigs[idx];

  asigs[idx].estado = 'REVERTIDA';
  DB.set('asignacionesRep', asigs);

  // Return repuesto to disponible
  const repuestos = DB.get('repuestos');
  const rIdx = repuestos.findIndex(r => r.id === a.repuestoId);
  if (rIdx >= 0) {
    repuestos[rIdx].estadoDisp = 'DISPONIBLE';
    repuestos[rIdx].activoAsignadoId = null;
    DB.set('repuestos', repuestos);
  }

  addMovimiento('REVERSION REPUESTO', a.repuestoCodigo + ' revertido de ' + a.activoCodigo + ' | Ticket original: ' + a.ticket);
  showToast('Asignacion revertida');
  renderAsignacionRepuestos(document.getElementById('contentArea'));
}

/* ── Export ── */
function _exportAsigRep() {
  const items = DB.get('asignacionesRep');
  if (items.length === 0) { showToast('No hay asignaciones para exportar', 'error'); return; }
  const headers = ['ID','FECHA','TICKET','MOTIVO','ACTIVO','CATEGORIA','REPUESTO_CODIGO','REPUESTO_TIPO','REPUESTO_DETALLE','SERIE','ESTADO','OBSERVACIONES'];
  const rows = items.map(a => [a.id, a.fecha||'', a.ticket||'', a.motivo||'', a.activoCodigo||'', a.categoria||'', a.repuestoCodigo||'', a.repuestoTipo||'', a.repuestoDesc||'', a.serie||'', a.estado||'', a.observaciones||'']);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asignaciones Repuestos');
  XLSX.writeFile(wb, 'Asignaciones_Repuestos.xlsx');
  showToast('Exportado correctamente');
}

/* ═══════════════════════════════════════════════════════
   COLABORADORES - PADRON
   ═══════════════════════════════════════════════════════ */
let padronSearch = '';
// Filtros de padrón consolidados en _padronActiveFilters

const _PADRON_FILTER_OPTIONS = [
  { key: 'estado',               label: 'Estado' },
  { key: 'modalidadContratacion', label: 'Mod. Contratación' },
  { key: 'area',                 label: 'Área' },
  { key: 'vicepresidencia',      label: 'Vicepresidencia' },
  { key: 'ubicacionFisica',      label: 'Ubicación Física' },
  { key: 'puesto',               label: 'Puesto' },
  { key: 'centroCosto',          label: 'Centro de Costo' }
];
let _padronActiveFilters = {};
let _padronFilterMenuOpen = false;

let _padronTab = 'empleados'; // 'empleados' | 'sitios'

function _switchPadronTab(tab) {
  _padronTab = tab;
  renderPadron(document.getElementById('contentArea'));
}

function renderPadron(el) {
  if (_padronTab === 'sitios') { renderSitiosMoviles(el); return; }

  const colabs = DB.get('colaboradores');

  const totalActivos = colabs.filter(c => c.estado === 'Activo').length;
  const totalCesados = colabs.filter(c => c.estado === 'Cesado').length;

  const _tabStyle = (active) => 'padding:10px 24px;font-size:13px;font-weight:600;border:none;cursor:pointer;border-bottom:3px solid ' + (active ? '#2563eb' : 'transparent') + ';color:' + (active ? '#2563eb' : '#64748b') + ';background:none;transition:all .15s';

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

    <!-- Tabs Empleados / Sitios Móviles -->
    <div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:20px">
      <button onclick="_switchPadronTab('empleados')" style="${_tabStyle(true)}">👥 Empleados</button>
      <button onclick="_switchPadronTab('sitios')" style="${_tabStyle(false)}">📍 Sitios Móviles</button>
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
      <div class="search-box" style="position:relative">
        <span class="search-icon">🔍</span>
        <input type="text" id="padronSearchInput" placeholder="Buscar por nombre, DNI, email, puesto, ubicación..."
               value="${esc(padronSearch)}"
               oninput="_onPadronSearch(this.value)">
        <span id="padronSearchClear" onclick="_clearPadronSearch()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;color:#94a3b8;font-size:16px;font-weight:700;width:24px;height:24px;display:${padronSearch ? 'flex' : 'none'};align-items:center;justify-content:center;border-radius:50%;transition:all .15s" onmouseover="this.style.background='#fee2e2';this.style.color='#dc2626'" onmouseout="this.style.background='';this.style.color='#94a3b8'" title="Limpiar búsqueda">✕</span>
      </div>
    </div>
    <div id="padronFiltersBar" style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap"></div>

    <div id="padronTableWrap"></div>
  `;
  _renderPadronFiltersBar();
  _renderPadronTable();
}

function _onPadronSearch(val) {
  padronSearch = val;
  const clearBtn = document.getElementById('padronSearchClear');
  if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
  resetPage('padron');
  debounceSearch('padron', _renderPadronTable);
}

function _clearPadronSearch() {
  padronSearch = '';
  const input = document.getElementById('padronSearchInput');
  if (input) { input.value = ''; input.focus(); }
  const clearBtn = document.getElementById('padronSearchClear');
  if (clearBtn) clearBtn.style.display = 'none';
  resetPage('padron');
  _renderPadronTable();
}

function _renderPadronFiltersBar() {
  const bar = document.getElementById('padronFiltersBar');
  if (!bar) return;
  const colabs = DB.get('colaboradores');

  let html = Object.keys(_padronActiveFilters).map(key => {
    const opt = _PADRON_FILTER_OPTIONS.find(o => o.key === key);
    if (!opt) return '';
    const values = ['Todos', ...new Set(colabs.map(c => c[key] || c[opt.key] || '').filter(Boolean))].sort((a, b) => a === 'Todos' ? -1 : b === 'Todos' ? 1 : a.localeCompare(b));
    const current = _padronActiveFilters[key] || 'Todos';
    return '<div style="display:flex;align-items:center;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;height:34px;background:#fff">'
      + '<select onchange="_padronActiveFilters[\'' + key + '\']=this.value;resetPage(\'padron\');_renderPadronTable()" style="border:none;padding:0 8px 0 10px;font-size:11px;color:#334155;height:100%;cursor:pointer;background:transparent;min-width:120px">'
      + values.map(v => '<option value="' + esc(v) + '" ' + (current === v ? 'selected' : '') + '>' + (v === 'Todos' ? esc(opt.label) + ': Todos' : esc(v)) + '</option>').join('')
      + '</select>'
      + '<button onclick="_padronRemoveFilter(\'' + key + '\')" style="border:none;background:none;cursor:pointer;padding:0 6px;color:#94a3b8;font-size:14px;height:100%;display:flex;align-items:center" onmouseover="this.style.color=\'#dc2626\'" onmouseout="this.style.color=\'#94a3b8\'" title="Quitar filtro">✕</button>'
      + '</div>';
  }).join('');

  // Botón "+"
  const inactiveFilters = _PADRON_FILTER_OPTIONS.filter(o => !_padronActiveFilters.hasOwnProperty(o.key));
  if (inactiveFilters.length > 0) {
    html += '<div id="padronFilterAddWrap" style="position:relative;display:inline-block">'
      + '<button id="padronFilterAddBtn" style="width:34px;height:34px;border-radius:8px;border:1px dashed #cbd5e1;background:#f8fafc;cursor:pointer;font-size:16px;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.borderColor=\'#2563eb\';this.style.color=\'#2563eb\'" onmouseout="this.style.borderColor=\'#cbd5e1\';this.style.color=\'#64748b\'" title="Agregar filtro">+</button>'
      + '<div id="padronFilterAddMenu" style="display:' + (_padronFilterMenuOpen ? 'block' : 'none') + ';position:absolute;top:38px;left:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:6px 0;z-index:999;min-width:200px">'
      + '<div style="padding:4px 12px 6px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Agregar filtro</div>'
      + inactiveFilters.map(o => '<div onclick="event.stopPropagation();_padronAddFilter(\'' + o.key + '\')" style="padding:7px 12px;font-size:12px;color:#334155;cursor:pointer;display:flex;align-items:center;gap:8px" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'\'">'
        + '<span style="color:#2563eb;font-size:14px">+</span> ' + esc(o.label)
        + '</div>').join('')
      + '</div></div>';
  }

  bar.innerHTML = html;

  const addBtn = document.getElementById('padronFilterAddBtn');
  if (addBtn) {
    addBtn.onclick = function(e) {
      e.stopPropagation();
      _padronFilterMenuOpen = !_padronFilterMenuOpen;
      const menu = document.getElementById('padronFilterAddMenu');
      if (menu) menu.style.display = _padronFilterMenuOpen ? 'block' : 'none';
    };
  }
}

function _padronAddFilter(key) {
  _padronActiveFilters[key] = 'Todos';
  _padronFilterMenuOpen = false;
  resetPage('padron');
  _renderPadronFiltersBar();
  _renderPadronTable();
}

function _padronRemoveFilter(key) {
  delete _padronActiveFilters[key];
  _padronFilterMenuOpen = false;
  resetPage('padron');
  _renderPadronFiltersBar();
  _renderPadronTable();
}

// Cerrar menú filtros padrón al hacer click fuera
document.addEventListener('click', function(e) {
  if (_padronFilterMenuOpen && !e.target.closest('#padronFiltersBar')) {
    _padronFilterMenuOpen = false;
    const menu = document.getElementById('padronFilterAddMenu');
    if (menu) menu.style.display = 'none';
  }
});

function _renderPadronTable() {
  const wrap = document.getElementById('padronTableWrap');
  if (!wrap) return;
  const colabs = DB.get('colaboradores');

  const filtered = colabs.filter(c => {
    // Filtros avanzados dinámicos
    for (const [key, val] of Object.entries(_padronActiveFilters)) {
      if (val && val !== 'Todos') {
        const cVal = (c[key] || '').toUpperCase();
        if (cVal !== val.toUpperCase()) return false;
      }
    }
    if (padronSearch) {
      const s = padronSearch.toLowerCase();
      return _fullName(c).toLowerCase().includes(s) ||
             (c.dni || '').toLowerCase().includes(s) ||
             (c.email || '').toLowerCase().includes(s) ||
             (c.puesto || c.tipoPuesto || '').toLowerCase().includes(s) ||
             (c.telefono || '').toLowerCase().includes(s) ||
             (c.modalidadContratacion || c.perfil || '').toLowerCase().includes(s) ||
             (c.ubicacionFisica || c.ubicacion || '').toLowerCase().includes(s) ||
             (c.vicepresidencia || '').toLowerCase().includes(s) ||
             (c.centroCosto || '').toLowerCase().includes(s);
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
              <th>Mod. Contratación</th>
              <th>Área</th>
              <th>Vicepresidencia</th>
              <th>Centro Costo</th>
              <th>Ubicación Física</th>
              <th>Puesto</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>F. Ingreso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? '<tr><td colspan="14"><div class="empty-state"><div class="empty-icon">👥</div><h3>Sin resultados</h3><p>No se encontraron colaboradores</p></div></td></tr>'
              : pagSlice(filtered, 'padron').map(c => {
                  const _mod = c.modalidadContratacion || c.perfil || '';
                  const perfilBadge = _mod === 'Empleado' ? 'badge-info' : _mod === 'Practicante' ? 'badge-warning' : _mod === 'Externo' ? 'badge-purple' : _mod === 'Intermediario' ? 'badge-success' : '';
                  return `
                    <tr>
                      <td style="font-size:12px;color:var(--text-light)">${c.id}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px">
                          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">
                            ${esc(_fullName(c).split(' ').map(p => p[0]).slice(0, 2).join(''))}
                          </div>
                          <strong>${esc(_fullName(c))}</strong>
                        </div>
                      </td>
                      <td style="font-size:12px">${esc(c.email || '—')}</td>
                      <td style="font-family:monospace;font-size:12px">${esc(c.dni)}</td>
                      <td>${_mod ? `<span class="badge ${perfilBadge}" style="font-size:10px">${esc(_mod)}</span>` : '—'}</td>
                      <td style="font-size:12px">${esc(c.area || '—')}</td>
                      <td style="font-size:12px">${esc(c.vicepresidencia || '—')}</td>
                      <td style="font-size:11px;font-family:monospace">${esc(c.centroCosto || '—')}</td>
                      <td style="font-size:12px">${esc(c.ubicacionFisica || c.ubicacion || '—')}</td>
                      <td style="font-size:12px">${esc(c.puesto || c.tipoPuesto || '—')}</td>
                      <td style="font-size:12px">${esc(c.telefono || '—')}</td>
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

  const _modC = c.modalidadContratacion || c.perfil || '';
  const perfilBadge = _modC === 'Empleado' ? 'badge-info' : _modC === 'Practicante' ? 'badge-warning' : _modC === 'Externo' ? 'badge-purple' : _modC === 'Intermediario' ? 'badge-success' : '';

  openModal('Detalle de Colaborador', `
    <div style="display:flex;flex-direction:column;gap:20px">
      <div style="display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700;flex-shrink:0">
          ${esc(_fullName(c).split(' ').map(p => p[0]).slice(0, 2).join(''))}
        </div>
        <div>
          <h3 style="margin:0;font-size:18px">${esc(_fullName(c))}</h3>
          <div style="font-size:13px;color:var(--text-muted)">${esc(c.puesto || c.tipoPuesto || 'Sin puesto')} — ${esc(c.area || 'Sin área')}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px">
          <span class="badge ${c.estado === 'Activo' ? 'badge-success' : 'badge-danger'}">${esc(c.estado)}</span>
          ${_modC ? `<span class="badge ${perfilBadge}">${esc(_modC)}</span>` : ''}
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
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Ubicación Física</label>
          <div style="font-size:14px">${esc(c.ubicacionFisica || c.ubicacion || '—')}</div>
        </div>
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Puesto</label>
          <div style="font-size:14px">${esc(c.puesto || c.tipoPuesto || '—')}</div>
        </div>
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Vicepresidencia</label>
          <div style="font-size:14px">${esc(c.vicepresidencia || '—')}</div>
        </div>
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Centro de Costo</label>
          <div style="font-size:14px;font-family:monospace">${esc(c.centroCosto || '—')}</div>
        </div>
        <div class="form-group">
          <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Correo Supervisor</label>
          <div style="font-size:14px">${esc(c.correoSupervisor || '—')}</div>
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
  { excel: 'NOMBRE',                  field: 'nombre',                required: true },
  { excel: 'APELLIDO',                field: 'apellido',              required: true },
  { excel: 'DNI',                     field: 'dni',                   required: true },
  { excel: 'EMAIL',                   field: 'email' },
  { excel: 'TELEFONO',                field: 'telefono' },
  { excel: 'MODALIDAD_CONTRATACION',  field: 'modalidadContratacion', required: true },
  { excel: 'AREA',                    field: 'area' },
  { excel: 'VICEPRESIDENCIA',         field: 'vicepresidencia' },
  { excel: 'CENTRO_DE_COSTO',         field: 'centroCosto' },
  { excel: 'UBICACION_FISICA',        field: 'ubicacionFisica' },
  { excel: 'PUESTO',                  field: 'puesto' },
  { excel: 'CORREO_SUPERVISOR',       field: 'correoSupervisor' },
  { excel: 'ESTADO',                  field: 'estado' },
  { excel: 'FECHA_DE_INGRESO',        field: 'fechaIngreso' }
];

let _cargaMasivaColabData = [];
let _cargaMasivaColabPage = 1;
const _CMP_PAGE_SIZE = 50;

let _cmColabStep = 1;
function openCargaMasivaColabModal() {
  _cargaMasivaColabData = [];
  _cargaMasivaColabPage = 1;
  _cmColabStep = 1;
  openModal('Carga Masiva de Colaboradores', '<div id="cmpContainer"></div>', `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
  _renderCmColabStep();
}

function _renderCmColabStep() {
  const w = document.getElementById('cmpContainer');
  if (!w) return;
  const _s = (active, done, n, label) => '<div class="rep-cm-step ' + (done ? 'done' : active ? 'active' : '') + '"><span class="rep-cm-step-num">' + (done ? '&#10003;' : n) + '</span><span class="rep-cm-step-label">' + label + '</span></div>';
  const steps = '<div class="rep-cm-steps">' + _s(_cmColabStep===1,_cmColabStep>1,1,'Descargar plantilla') + _s(_cmColabStep===2,_cmColabStep>2,2,'Subir archivo') + _s(_cmColabStep===3,_cmColabStep>3,3,'Revisar preview') + _s(_cmColabStep===4,false,4,'Confirmar') + '</div>';

  if (_cmColabStep === 1) {
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" style="text-align:center;padding:30px 0"><div style="font-size:48px;margin-bottom:12px">&#128203;</div><h3 style="margin-bottom:8px">Paso 1: Descargar Plantilla</h3><p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">Descarga la plantilla Excel con el formato correcto para importar colaboradores.</p><button class="btn btn-primary" onclick="descargarPlantillaColab();_cmColabStep=2;_renderCmColabStep()">&#128203; Descargar Plantilla</button><button class="btn btn-secondary" onclick="_cmColabStep=2;_renderCmColabStep()" style="margin-left:8px">Ya tengo la plantilla &rarr;</button></div></div>';
  } else if (_cmColabStep === 2) {
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" style="text-align:center;padding:30px 0"><div class="rep-cm-dropzone" id="cmpDropZone" onclick="document.getElementById(\'cmpFileInput2\').click()"><div style="font-size:48px;margin-bottom:12px">&#128229;</div><p style="font-weight:600;color:var(--text);margin-bottom:4px">Arrastra o selecciona tu archivo Excel</p><p style="font-size:13px;color:var(--text-secondary)">.xlsx o .xls</p><input type="file" id="cmpFileInput2" accept=".xlsx,.xls" style="display:none" onchange="procesarExcelColab(this.files[0])"></div></div></div>';
    const dz = document.getElementById('cmpDropZone');
    if (dz) { dz.ondragover = e => { e.preventDefault(); dz.classList.add('dragover'); }; dz.ondragleave = () => dz.classList.remove('dragover'); dz.ondrop = e => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files.length) procesarExcelColab(e.dataTransfer.files[0]); }; }
  } else if (_cmColabStep === 3) {
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" id="cmpPreviewWrap"></div></div>';
    _renderCargaMasivaColabPreview();
  } else if (_cmColabStep === 4) {
    const validos = _cargaMasivaColabData.filter(r => r._valid).length;
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" style="text-align:center;padding:30px 0"><div style="font-size:48px;margin-bottom:12px">&#9989;</div><h3 style="margin-bottom:8px">Confirmar Importaci&oacute;n</h3><p style="color:var(--text-secondary);margin-bottom:20px">Se importar&aacute;n <strong>' + validos + '</strong> colaboradores.</p><button class="btn btn-primary" onclick="ejecutarCargaMasivaColab()" style="font-size:14px;padding:12px 32px">&#128229; Importar ' + validos + ' colaboradores</button><button class="btn btn-secondary" onclick="_cmColabStep=3;_renderCmColabStep()" style="margin-left:8px">&larr; Volver</button></div></div>';
  }
}

function descargarPlantillaColab() {
  const headers = _CMP_COLUMNS.map(c => c.excel);
  const ejemplo = [
    'Juan', 'Pérez', '12345678', 'juan.perez@empresa.com', '987654321',
    'Empleado', 'TI', 'B2C', '1000-03608-00', 'Sede Central', 'Presencial', 'pedro.ruiz@empresa.com',
    'Activo', '15/01/2026'
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
      // DNIs existentes en BD
      const _existingDNIs = new Set(DB.get('colaboradores').map(c => (c.dni || '').toUpperCase().trim()).filter(Boolean));
      // DNIs de sitios móviles
      const _sitiosDNIs = new Set(DB.get('sitiosMoviles').map(s => (s.dni || '').toUpperCase().trim()).filter(Boolean));
      // DNIs en el propio Excel (para detectar duplicados internos)
      const _excelDNIs = {};

      // Primera pasada: contar DNIs en el excel
      rows.forEach((row, i) => {
        const rowKeys = Object.keys(row);
        const dniCol = rowKeys.find(k => k.toUpperCase().replace(/\s+/g, '_') === 'DNI') || 'DNI';
        const dniVal = String(row[dniCol] || '').trim().toUpperCase();
        if (dniVal) {
          if (!_excelDNIs[dniVal]) _excelDNIs[dniVal] = [];
          _excelDNIs[dniVal].push(i);
        }
      });

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
        // Compatibilidad: mapear campos viejos a nuevos
        if (!mapped.modalidadContratacion && mapped.perfil) mapped.modalidadContratacion = mapped.perfil;
        if (!mapped.apellido && mapped.nombre && mapped.nombre.includes(' ')) {
          const parts = mapped.nombre.split(' ');
          mapped.nombre = parts[0];
          mapped.apellido = parts.slice(1).join(' ');
        }
        if (!mapped.ubicacionFisica && mapped.ubicacion) mapped.ubicacionFisica = mapped.ubicacion;
        if (!mapped.puesto && mapped.tipoPuesto) mapped.puesto = mapped.tipoPuesto;
        // Sync old/new fields
        mapped.perfil = mapped.modalidadContratacion || mapped.perfil || '';
        mapped.ubicacion = mapped.ubicacionFisica || mapped.ubicacion || '';
        mapped.tipoPuesto = mapped.puesto || mapped.tipoPuesto || '';

        // Validación detallada por campo
        const fieldErrors = {};
        if (!mapped.nombre) fieldErrors.nombre = 'Vacío';
        if (!mapped.apellido) fieldErrors.apellido = 'Vacío';
        if (!mapped.dni) fieldErrors.dni = 'Vacío';
        else {
          const dniUp = mapped.dni.toUpperCase().trim();
          if (_existingDNIs.has(dniUp)) fieldErrors.dni = 'Ya existe en BD';
          else if (_sitiosDNIs.has(dniUp)) fieldErrors.dni = 'Duplicado en Sitios Móviles';
          else if (_excelDNIs[dniUp] && _excelDNIs[dniUp].length > 1) fieldErrors.dni = 'Duplicado en Excel';
        }
        if (!mapped.modalidadContratacion) fieldErrors.modalidadContratacion = 'Vacío';
        else if (!perfilesValidos.includes(mapped.modalidadContratacion)) fieldErrors.modalidadContratacion = 'Valor inválido (use: ' + perfilesValidos.join(', ') + ')';
        if (mapped.fechaIngreso && !/^\d{4}-\d{2}-\d{2}$/.test(mapped.fechaIngreso)) fieldErrors.fechaIngreso = 'Formato fecha inválido';

        const errors = Object.keys(fieldErrors).map(k => k + ': ' + fieldErrors[k]);
        return { ...mapped, _row: i + 2, _errors: errors, _fieldErrors: fieldErrors, _valid: errors.length === 0 };
      });

      _cargaMasivaColabPage = 1;
      _cmColabStep = 3;
      _renderCmColabStep();
    } catch (err) {
      showToast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

let _cmpShowOnlyErrors = false;

function _renderCargaMasivaColabPreview() {
  const container = document.getElementById('cmpPreviewWrap') || document.getElementById('cmpContainer');
  if (!container) return;

  const total = _cargaMasivaColabData.length;
  const validos = _cargaMasivaColabData.filter(r => r._valid).length;
  const errores = total - validos;

  // Filtrar datos según toggle
  const filteredData = _cmpShowOnlyErrors ? _cargaMasivaColabData.filter(r => !r._valid) : _cargaMasivaColabData;
  const filteredTotal = filteredData.length;

  const tp = Math.max(1, Math.ceil(filteredTotal / _CMP_PAGE_SIZE));
  if (_cargaMasivaColabPage > tp) _cargaMasivaColabPage = tp;
  const start = (_cargaMasivaColabPage - 1) * _CMP_PAGE_SIZE;
  const pageData = filteredData.slice(start, start + _CMP_PAGE_SIZE);

  container.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#f0fdf4;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#16a34a">${validos}</div>
        <div style="font-size:11px;color:#15803d">Válidos</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:${errores > 0 ? '#fef2f2' : '#f8fafc'};border-radius:8px;text-align:center;cursor:${errores > 0 ? 'pointer' : 'default'}" ${errores > 0 ? 'onclick="_cmpShowOnlyErrors=!_cmpShowOnlyErrors;_cargaMasivaColabPage=1;_renderCargaMasivaColabPreview()"' : ''}>
        <div style="font-size:22px;font-weight:700;color:${errores > 0 ? '#dc2626' : '#94a3b8'}">${errores}</div>
        <div style="font-size:11px;color:${errores > 0 ? '#b91c1c' : '#64748b'}">Con errores ${_cmpShowOnlyErrors ? '(filtrado)' : ''}</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#f8fafc;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#334155">${total}</div>
        <div style="font-size:11px;color:#64748b">Total filas</div>
      </div>
    </div>

    ${errores > 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#991b1b;display:flex;align-items:center;justify-content:space-between">
      <span>⚠️ <strong>${errores} fila(s) con error</strong> no se importarán.</span>
      <button class="btn btn-sm" onclick="_cmpShowOnlyErrors=!_cmpShowOnlyErrors;_cargaMasivaColabPage=1;_renderCargaMasivaColabPreview()" style="font-size:11px;padding:3px 10px;background:${_cmpShowOnlyErrors ? '#dc2626' : '#fff'};color:${_cmpShowOnlyErrors ? '#fff' : '#dc2626'};border:1px solid #dc2626;border-radius:4px;cursor:pointer">${_cmpShowOnlyErrors ? '📋 Ver todos' : '⚠ Ver solo errores'}</button>
    </div>` : ''}

    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;font-size:12px">
        <thead>
          <tr>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">#</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">✓</th>
            <th style="padding:8px 6px;font-size:11px;background:#fef2f2;color:#991b1b;min-width:220px">ERROR</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Nombre *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Apellido *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">DNI *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Email</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Mod. Contrat. *</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Área</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Ubic. Física</th>
            <th style="padding:8px 6px;font-size:11px;background:var(--bg-secondary)">Puesto</th>
          </tr>
        </thead>
        <tbody>
          ${pageData.map(r => {
            const fe = r._fieldErrors || {};
            const _cs = (field) => fe[field] ? 'background:#fef2f2;color:#dc2626;font-weight:600' : '';
            return `
            <tr style="${r._valid ? '' : 'background:#fef2f2'}">
              <td style="padding:6px;color:var(--text-light)">${r._row}</td>
              <td style="padding:6px;text-align:center">${r._valid ? '<span style="color:#16a34a;font-weight:700">✓</span>' : '<span style="color:#dc2626;font-weight:700">✗</span>'}</td>
              <td style="padding:6px;font-size:10px;color:#dc2626;font-weight:${r._errors.length ? '600' : 'normal'}">${r._errors.length > 0 ? r._errors.map(e => esc(e)).join(' | ') : '<span style="color:#16a34a">—</span>'}</td>
              <td style="padding:6px;${_cs('nombre')}">${esc(r.nombre || '⚠ vacío')}</td>
              <td style="padding:6px;${_cs('apellido')}">${esc(r.apellido || '⚠ vacío')}</td>
              <td style="padding:6px;font-family:monospace;${_cs('dni')}">${esc(r.dni || '⚠ vacío')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.email || '—')}</td>
              <td style="padding:6px;${_cs('modalidadContratacion')}">${esc(r.modalidadContratacion || '⚠ vacío')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.area || '—')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.ubicacionFisica || '—')}</td>
              <td style="padding:6px;font-size:11px">${esc(r.puesto || '—')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${tp > 1 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;color:var(--text-light)">
        <span>Mostrando ${start + 1}–${Math.min(start + _CMP_PAGE_SIZE, filteredTotal)} de ${filteredTotal}${_cmpShowOnlyErrors ? ' (solo errores)' : ''}</span>
        <div style="display:flex;gap:4px">
          ${_cargaMasivaColabPage > 1 ? '<button class="btn btn-sm" onclick="_cargaMasivaColabPage--;_renderCargaMasivaColabPreview()" style="font-size:11px;padding:3px 8px">‹ Ant</button>' : ''}
          <span style="padding:3px 8px;font-weight:600">${_cargaMasivaColabPage} / ${tp}</span>
          ${_cargaMasivaColabPage < tp ? '<button class="btn btn-sm" onclick="_cargaMasivaColabPage++;_renderCargaMasivaColabPreview()" style="font-size:11px;padding:3px 8px">Sig ›</button>' : ''}
        </div>
      </div>
    ` : ''}

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
      <button class="btn btn-secondary" onclick="_cmColabStep=2;_cargaMasivaColabData=[];_renderCmColabStep()">&larr; Subir otro archivo</button>
      ${validos > 0 ? `<button class="btn btn-primary" onclick="_cmColabStep=4;_renderCmColabStep()">Continuar con ${validos} v&aacute;lidos &rarr;</button>` : '<span style="color:#dc2626;font-weight:600">No hay registros v&aacute;lidos</span>'}
    </div>
  `;
}

async function ejecutarCargaMasivaColab() {
  const validos = _cargaMasivaColabData.filter(r => r._valid);
  if (validos.length === 0) { showToast('No hay registros válidos para importar', 'error'); return; }

  if (!confirm('¿Importar ' + validos.length + ' colaboradores?')) return;

  const colabs = DB.get('colaboradores');
  let id = nextId(colabs);

  validos.forEach(r => {
    colabs.push({
      id: id++,
      nombre: r.nombre,
      apellido: r.apellido || '',
      dni: r.dni,
      email: r.email || '',
      telefono: r.telefono || '',
      modalidadContratacion: r.modalidadContratacion || r.perfil,
      perfil: r.modalidadContratacion || r.perfil,
      area: r.area || '',
      vicepresidencia: r.vicepresidencia || '',
      centroCosto: r.centroCosto || '',
      ubicacionFisica: r.ubicacionFisica || r.ubicacion || '',
      ubicacion: r.ubicacionFisica || r.ubicacion || '',
      puesto: r.puesto || r.tipoPuesto || '',
      tipoPuesto: r.puesto || r.tipoPuesto || '',
      correoSupervisor: r.correoSupervisor || '',
      estado: r.estado || 'Activo',
      fechaIngreso: r.fechaIngreso || today()
    });
  });

  DB.set('colaboradores', colabs);
  addMovimiento('Carga Masiva Colaboradores', `Se importaron ${validos.length} colaboradores desde Excel`);
  await DB.flush();
  closeModal();
  showToast(`${validos.length} colaboradores importados correctamente`);
  renderPadron(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   COLABORADORES - ASIGNACION
   ═══════════════════════════════════════════════════════ */
let asigSearch = '';
let _asigSelectedColab = null;
let _asigSelectedActivos = [];
let _asigTipoDestino = 'colaborador'; // 'colaborador' | 'sitio'
let _asigSelectedSitio = null;

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
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="openAsignacionModal()">+ Nueva Asignaci&oacute;n</button>
        <button class="btn" onclick="_openCargaMasivaAsigModal()" style="background:#059669;color:#fff;border-color:#059669">&#128229; Carga Masiva</button>
      </div>
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
  debounceSearch('asig', _renderAsigTable);
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
        sitioNombre: a.sitioNombre || '',
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
              <th>Destino</th>
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
                    <td style="font-size:11px">${g.sitioNombre ? esc(g.sitioNombre) : esc(g.correoColab || '—')}</td>
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
  _asigSelectedSitio = null;
  _asigTipoDestino = 'colaborador';
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
    if (isEstadoNoAsignable(a.estado)) return;
    // En reemplazo con equipo seleccionado, filtrar por mismo tipo
    if (isReemplazo && reemTipoFiltro && (a.tipo||'').toUpperCase().trim() !== reemTipoFiltro) return;
    (a.series||[]).forEach(s => {
      const key = a.id + '||' + (s.serie||'').toUpperCase().trim();
      if (!seriesAsig.has(key)) {
        stock.push({ activoId: a.id, tipo: (a.tipo||'').toUpperCase().trim(), equipo: a.equipo||a.tipo||'', marca: a.marca, modelo: a.modelo, serie: s.serie||'', codInv: s.codInv||'', ubicacion: a.ubicacion||'', codigo: a.codigo||'', gama: a.gama||'' });
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
        <div style="flex:1">
          <h2 style="margin:0;font-size:17px;font-weight:800;color:#0f172a">${isReposicionRobo ? 'Reposición por Robo' : isReposicionDano ? 'Reposición por Daño Físico' : isReemplazo ? (isRenovacion ? 'Renovación de Equipo' : 'Reemplazo de Equipo') : isPrestamo ? 'Préstamo de Equipo' : isIngresoNuevo ? 'Ingreso Nuevo — Asignación Inicial' : 'Asignación de Activo'}</h2>
          <div style="font-size:11px;color:#64748b;margin-top:1px">${isReposicionRobo ? 'Reponer equipo robado y registrar el caso para control y trazabilidad' : isReposicionDano ? 'Reponer equipo dañado físicamente a un colaborador' : isReemplazo ? (isRenovacion ? 'Renovar equipo asignado a un colaborador' : 'Reemplazar equipo asignado a un colaborador') : isPrestamo ? 'Préstamo temporal de equipo a un colaborador' : isIngresoNuevo ? 'Asignar kit inicial a un colaborador nuevo sin equipo' : 'Asignar equipos del inventario a un colaborador'}</div>
        </div>
        ${!isReemplazo ? `
        <div style="display:flex;gap:0;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;flex-shrink:0">
          <button onclick="_asigTipoDestino='colaborador';_asigSelectedSitio=null;_renderAsignacionModal()" style="padding:5px 12px;border:none;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .15s;${_asigTipoDestino === 'colaborador' ? 'background:#2563eb;color:#fff' : 'background:#fff;color:#64748b'}">
            👤 Colaborador
          </button>
          <button onclick="_asigTipoDestino='sitio';_asigSelectedColab=null;if(!['ASIGNACIÓN','REEMPLAZO','RENOVACIÓN'].includes((_asigMotivo||'').toUpperCase())){_asigMotivo=''};_renderAsignacionModal()" style="padding:5px 12px;border:none;border-left:1px solid #e2e8f0;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .15s;${_asigTipoDestino === 'sitio' ? 'background:#f59e0b;color:#fff' : 'background:#fff;color:#64748b'}">
            📍 Sitio Móvil
          </button>
        </div>
        ` : ''}
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
            ${motivosAsig.map(m => {
              const _motivosSitio = ['ASIGNACIÓN','REEMPLAZO','RENOVACIÓN'];
              const _disabled = _asigTipoDestino === 'sitio' && !_motivosSitio.includes(m) ? 'disabled style="color:#cbd5e1"' : '';
              return `<option value="${esc(m)}" ${motVal.toUpperCase() === m ? 'selected' : ''} ${_disabled}>${esc(m)}</option>`;
            }).join('')}
          </select>
          `}
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Observaciones</label>
          <input class="form-control" id="fAsigObs" placeholder="Ingrese observaciones aquí..." value="${esc(_asigObs)}" style="height:38px;font-size:12px">
        </div>
      </div>

      <!-- Tipo destino tabs moved to header -->

      <!-- Row 3: Colaborador / Sitio -->
      ${_asigTipoDestino === 'sitio' ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div style="border:1px solid #fde68a;border-radius:10px;padding:12px;background:#fffbeb">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <span style="font-size:14px">📍</span>
            <span style="font-size:12px;font-weight:700;color:#92400e">Sitio Móvil</span>
          </div>
          <div style="position:relative">
            <div style="display:flex;align-items:center;border:1px solid #fde68a;border-radius:8px;overflow:hidden;height:36px;background:#fff">
              <span style="padding:0 8px;font-size:13px;color:#d97706">🔍</span>
              <input class="form-control" id="fAsigSitioSearch" placeholder="Buscar por sede, área, piso..."
                oninput="_buscarSitioAsig(this.value)" autocomplete="off" value="${_asigSelectedSitio ? esc(_buildSitioNombre(_asigSelectedSitio)) : ''}"
                style="border:none;border-radius:0;height:100%;font-size:12px;flex:1;background:transparent">
              <span onclick="_toggleSitioDropdown()" style="padding:0 10px;cursor:pointer;font-size:12px;color:#92400e;height:100%;display:flex;align-items:center;border-left:1px solid #fde68a;background:#fef3c7;user-select:none" title="Ver lista de sitios">▼</span>
            </div>
            <div id="asigSitioResults" style="position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;max-height:220px;overflow-y:auto;z-index:10;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.1)"></div>
          </div>
        </div>
        <div style="border:1px solid ${_asigSelectedSitio ? '#fde68a' : '#e2e8f0'};border-radius:10px;padding:12px;background:${_asigSelectedSitio ? '#fffbeb' : '#fafafa'}">
          ${_asigSelectedSitio ? `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
              <span style="width:18px;height:18px;border-radius:50%;background:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff">✓</span>
              <span style="font-size:11px;font-weight:600;color:#334155">Sitio seleccionado:</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;flex-shrink:0">📍</div>
              <div>
                <div style="font-size:13px;font-weight:700;color:#0f172a">${esc(_buildSitioNombre(_asigSelectedSitio))}</div>
                <div style="font-size:11px;color:#64748b">${esc(_asigSelectedSitio.area || '')} — ${esc(_asigSelectedSitio.sede || '')}</div>
              </div>
            </div>
          ` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px">Seleccione un sitio móvil...</div>'}
        </div>
      </div>
      ` : `
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
                oninput="_buscarColabAsig(this.value)" autocomplete="off" value="${c ? esc(_fullName(c)) : ''}"
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
              <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">${esc(_fullName(c).split(' ').map(p=>p[0]).slice(0,2).join(''))}</div>
              <div>
                <div style="font-size:13px;font-weight:700;color:#0f172a">${esc(_fullName(c))}</div>
                <div style="font-size:11px;color:#64748b">${esc(c.area||'')} - ${esc(c.ubicacionFisica || c.ubicacion || '')} &nbsp;|&nbsp; ${esc(c.puesto || c.tipoPuesto || '')}</div>
              </div>
            </div>
          ` : `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px">Seleccione un colaborador...</div>
          `}
        </div>
      </div>
      `}
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

function _onSitioAsigChange(val) {
  const id = parseInt(val);
  if (!id) { _asigSelectedSitio = null; _renderAsignacionModal(); return; }
  const sitios = DB.get('sitiosMoviles');
  _asigSelectedSitio = sitios.find(s => s.id === id) || null;
  _renderAsignacionModal();
}

function _buscarSitioAsig(val) {
  debounceSearch('buscarSitio', () => {
    const box = document.getElementById('asigSitioResults');
    if (!box) return;
    if (!val || val.length < 2) { box.style.display = 'none'; return; }
    const sitios = DB.get('sitiosMoviles').filter(s => s.estado === 'Activo' || (s.estado || '').toUpperCase() === 'ACTIVO');
    const q = val.toLowerCase();
    const found = sitios.filter(st =>
      _buildSitioNombre(st).toLowerCase().includes(q) ||
      (st.sede || '').toLowerCase().includes(q) ||
      (st.area || '').toLowerCase().includes(q) ||
      (st.piso || '').toLowerCase().includes(q) ||
      (st.ubicacion || '').toLowerCase().includes(q)
    ).slice(0, 8);
    _renderSitioResults(box, found);
  }, 150);
}

function _renderSitioResults(box, found) {
  if (found.length === 0) {
    box.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--text-muted)">Sin coincidencias</div>';
  } else {
    box.innerHTML = found.map(s => `
      <div style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
           onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background=''"
           onclick="_selectSitioAsig(${s.id})">
        <div>
          <strong>${esc(_buildSitioNombre(s))}</strong>
        </div>
        <span style="color:var(--text-light);font-size:11px">${esc(s.area || '')}</span>
      </div>
    `).join('');
  }
  box.style.display = 'block';
}

function _toggleSitioDropdown() {
  const box = document.getElementById('asigSitioResults');
  if (!box) return;
  if (box.style.display === 'block') { box.style.display = 'none'; return; }
  const sitios = DB.get('sitiosMoviles').filter(s => s.estado === 'Activo' || (s.estado || '').toUpperCase() === 'ACTIVO');
  _renderSitioResults(box, sitios.slice(0, 15));
}

function _selectSitioAsig(id) {
  const sitios = DB.get('sitiosMoviles');
  _asigSelectedSitio = sitios.find(s => s.id === id) || null;
  _renderAsignacionModal();
}

function _buscarColabAsig(val) {
  debounceSearch('buscarColab', () => {
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
      _fullName(c).toLowerCase().includes(s) ||
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
          <strong>${esc(_fullName(c))}</strong>
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
      if (isEstadoNoAsignable(a.estado)) return;
      if (tipoFiltro && (a.tipo || '').toUpperCase().trim() !== tipoFiltro) return;
      (a.series || []).forEach(s => {
        const key = a.id + '||' + (s.serie || '').toUpperCase().trim();
        if (!seriesAsignadas.has(key)) {
          stock.push({ activoId: a.id, tipo: a.tipo, equipo: a.equipo||a.tipo||'', marca: a.marca, modelo: a.modelo, serie: s.serie || '', codInv: s.codInv || '', ubicacion: a.ubicacion || '', codigo: a.codigo || '', gama: a.gama || '' });
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
            <input class="form-control" id="reemUserSearch" placeholder="Buscar por nombre, DNI o correo..." oninput="_reemBuscarColab(this.value)" autocomplete="off" value="${c ? esc(_fullName(c)) : ''}" style="height:36px;font-size:12px">
            <div id="reemUserResults" style="position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;max-height:160px;overflow-y:auto;z-index:10;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.1)"></div>
          </div>
          ${c ? `<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">${esc(_fullName(c).split(' ').map(p=>p[0]).slice(0,2).join(''))}</div>
            <div style="font-size:11px;line-height:1.3"><strong>${esc(_fullName(c))}</strong><br><span style="color:#64748b">${esc(c.email||'')} · ${esc(c.area||'')}</span></div>
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

function _reemBuscarColab(val) {
  debounceSearch('reemBuscar', () => {
    const box = document.getElementById('reemUserResults');
    if (!box) return;
    if (!val || val.length < 2) { box.style.display = 'none'; return; }
    const colabs = DB.get('colaboradores').filter(c => c.estado === 'Activo');
    const s = val.toLowerCase();
    const found = colabs.filter(c => _fullName(c).toLowerCase().includes(s) || (c.dni||'').toLowerCase().includes(s) || (c.email||'').toLowerCase().includes(s)).slice(0,8);
    if (found.length === 0) {
      box.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--text-muted)">Sin coincidencias</div>';
    } else {
      box.innerHTML = found.map(c => `
        <div style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''" onclick="_reemSelectColab(${c.id})">
          <div><strong>${esc(_fullName(c))}</strong> <span style="color:#94a3b8;margin-left:4px">DNI: ${esc(c.dni)}</span></div>
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
    asig.push(createAsignacion(asig, {
      activo: newActivo,
      serie: _reemNewItem.serie || '',
      colab: colab,
      fecha: fecha,
      tipoAsignacion: 'Reemplazo',
      motivo: 'REEMPLAZO - ' + motivo,
      ticket: ticket,
      observaciones: obs
    }));

    // Actualizar estado del nuevo activo (1 activo = 1 serie)
    newActivo.estado = 'Asignado';
    newActivo.responsable = _fullName(colab);
  }

  DB.set('activos', activos);
  DB.set('asignaciones', asig);
  addMovimiento('Reemplazo', `${_reemOldAsig.serieAsignada || '—'} → ${_reemNewItem.serie || '—'} para ${_fullName(colab)} [${ticket}] — ${motivo}`);

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
      codInv: _oldAct.codInv || '',
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
      codInv: _newAct.codInv || '',
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
    if (isEstadoNoAsignable(a.estado)) return;
    const series = a.series || [];
    // Solo mostrar activos que tengan series con stock
    if (series.length === 0) return;
    series.forEach(s => {
      // Solo mostrar series que no estén asignadas (vigentes)
      const key = a.id + '||' + (s.serie || '').toUpperCase().trim();
      if (!seriesAsignadas.has(key)) {
        stock.push({ activoId: a.id, tipo: (a.tipo || '').toUpperCase().trim(), equipo: (a.equipo || a.tipo || '').toUpperCase().trim(), marca: a.marca, modelo: a.modelo, serie: s.serie || '', codInv: s.codInv || '', estadoEquipo: a.estadoEquipo || '' });
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
      r.codInv.toLowerCase().includes(s)
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
        <th style="padding:8px 6px;background:var(--bg-secondary);position:sticky;top:0">Cod. Inv</th>
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
          <td style="padding:6px;font-family:monospace;font-size:11px">${esc(r.codInv || '—')}</td>
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

async function saveAsignacion() {
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
  if (_asigTipoDestino === 'sitio') {
    if (!_asigSelectedSitio) { showToast('Seleccione un sitio móvil', 'error'); return; }
  } else {
    if (!_asigSelectedColab) { showToast('Seleccione un colaborador', 'error'); return; }
  }
  if (!motivo) { showToast('Seleccione el motivo de asignación', 'error'); return; }
  if (isPrestamo && !fechaFinPrestamo) { showToast('Ingrese la fecha fin de préstamo', 'error'); return; }
  if (isPrestamo && fechaFinPrestamo < today()) { showToast('La fecha fin de préstamo debe ser mayor o igual a hoy', 'error'); return; }
  if (isReemplazo && !_asigReemOld) { showToast(isReposicionRobo ? 'Seleccione el equipo robado' : isReposicionDano ? 'Seleccione el equipo dañado a retirar' : 'Seleccione el equipo a reemplazar', 'error'); return; }
  if (_asigSelectedActivos.length === 0) { showToast('Seleccione al menos un equipo principal' + (isReemplazo ? ' nuevo' : ''), 'error'); return; }

  const activos = DB.get('activos');
  const asig = DB.get('asignaciones');
  const colab = _asigTipoDestino === 'sitio' ? null : _asigSelectedColab;
  const sitio = _asigTipoDestino === 'sitio' ? _asigSelectedSitio : null;

  // ── VALIDACIÓN EP-ADMIN: máximo 1 equipo principal por colaborador ──
  if (colab && !isReemplazo) {
    const epAdminSeleccionados = _asigSelectedActivos.filter(sel => {
      const act = activos.find(a => a.id === sel.activoId);
      return act && getMapeoFuncional(act.tipo || act.equipo) === 'EP-ADMIN';
    });
    if (epAdminSeleccionados.length > 0) {
      const yaEPAdmin = asig.find(a => a.colaboradorId === colab.id && a.estado === 'Vigente' && !a.pendienteRetorno && (() => {
        const act = activos.find(x => x.id === a.activoId);
        return act && getMapeoFuncional(act.tipo || act.equipo) === 'EP-ADMIN';
      })());
      if (yaEPAdmin) {
        showToast('El colaborador ya tiene un equipo principal (EP-ADMIN) asignado. Debe ejecutar un Reemplazo o Devolución primero.', 'error');
        return;
      }
    }
    if (epAdminSeleccionados.length > 1) {
      showToast('Solo puede asignar 1 equipo principal (EP-ADMIN) por colaborador.', 'error');
      return;
    }
  }

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

    asig.push(createAsignacion(asig, {
      activo: activo,
      serie: sel.serie || '',
      colab: colab,
      sitio: sitio,
      fecha: fecha,
      tipoAsignacion: motivo,
      motivo: motivo,
      ticket: ticket,
      observaciones: obs,
      fechaFinPrestamo: isPrestamo ? fechaFinPrestamo : ''
    }));
  });

  // Actualizar estado de cada activo nuevo (1 activo = 1 serie)
  const activoIds = [...new Set(_asigSelectedActivos.map(s => s.activoId))];
  activoIds.forEach(aid => {
    const activo = activos.find(a => a.id === aid);
    if (!activo) return;
    activo.estado = 'Asignado';
    setResponsable(activo, colab, sitio);
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

      asig.push(createAsignacion(asig, {
        activo: activo,
        serie: sel.serie || '',
        colab: colab,
        sitio: sitio,
        fecha: fecha,
        tipoAsignacion: motivo,
        motivo: motivo,
        ticket: ticket,
        observaciones: obs
      }));
    });

    // Actualizar estado de activos accesorios (1 activo = 1 serie)
    const accActivoIds = [...new Set(_asigSelectedAccesorios.map(s => s.activoId))];
    accActivoIds.forEach(aid => {
      const activo = activos.find(a => a.id === aid);
      if (!activo) return;
      activo.estado = 'Asignado';
      setResponsable(activo, colab, sitio);
    });
  }

  DB.set('activos', activos);
  DB.set('asignaciones', asig);

  const _totalEquipos = _asigSelectedActivos.length + (isIngresoNuevo ? _asigSelectedAccesorios.length : 0);
  const _destNombre = colab ? _fullName(colab) : (sitio ? _buildSitioNombre(sitio) : '');

  if (isReemplazo) {
    const _movTipo = isReposicionRobo ? 'Reposición Robo' : isReposicionDano ? 'Reposición Daño Físico' : isRenovacion ? 'Renovación' : 'Reemplazo';
    addMovimiento(_movTipo, `${_movTipo} de equipo para ${_destNombre} [${ticket}]`);
  } else if (isIngresoNuevo) {
    addMovimiento('Ingreso Nuevo', `${_totalEquipos} activo(s) asignados (kit inicial) a ${_destNombre} [${ticket}]`);
  } else {
    addMovimiento(isPrestamo ? 'Préstamo' : 'Asignación', isPrestamo ? `${_asigSelectedActivos.length} activo(s) en préstamo a ${_destNombre} hasta ${formatDate(fechaFinPrestamo)} [${ticket}]` : `${_asigSelectedActivos.length} activo(s) asignados a ${_destNombre} [${ticket}]`);
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
      codInv: _act.codInv || '',
      correo: colab ? (colab.email || '') : (sitio ? _buildSitioNombre(sitio) : ''),
      ticket: ticket || '',
      motivo: _motSaveUp.includes('REEMPLAZO') || _motSaveUp.includes('RENOVACIÓN') || _motSaveUp.includes('RENOVACION') || _motSaveUp.includes('PRÉSTAMO') || _motSaveUp.includes('PRESTAMO') || isReposicionDano || isReposicionRobo ? motivo : (sitio ? 'ASIGNACIÓN SITIO' : '')
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
        codInv: _act.codInv || '',
        correo: colab ? (colab.email || '') : (sitio ? _buildSitioNombre(sitio) : ''),
        ticket: ticket || '',
        motivo: sitio ? 'ASIGNACIÓN SITIO' : ''
      });
    });
  }

  await DB.flush();
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

/* ── ASIGNACIONES — CARGA MASIVA ── */
let _cmAsigData = [];
let _cmAsigStep = 1;
const _CM_ASIG_COLS = [
  { excel: 'TICKET',              field: 'ticket' },
  { excel: 'FECHA_ASIGNACION',    field: 'fechaAsignacion' },
  { excel: 'MOTIVO',              field: 'motivo',           required: true },
  { excel: 'COD_INV',              field: 'codInv' },
  { excel: 'SERIE',               field: 'serie' },
  { excel: 'USO_EQUIPO',          field: 'usoEquipo' },
  { excel: 'TIPO_DESTINO',        field: 'tipoDestino' },
  { excel: 'CORREO_COLABORADOR',  field: 'correoColaborador' },
  { excel: 'SITIO_CODIGO',        field: 'sitioCodigo' },
  { excel: 'ACTA_ENTREGA',        field: 'actaEntrega' },
  { excel: 'FECHA_FIN_PRESTAMO',  field: 'fechaFinPrestamo' },
  { excel: 'OBSERVACIONES',       field: 'observaciones' }
];

function _openCargaMasivaAsigModal() {
  _cmAsigData = [];
  _cmAsigStep = 1;
  _cmAsigShowOnlyErrors = false;
  _cmAsigPage = 1;
  openModal('Carga Masiva de Asignaciones', '<div id="cmAsigContainer"></div>', `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
  _renderCmAsigStep();
}

function _renderCmAsigStep() {
  const w = document.getElementById('cmAsigContainer');
  if (!w) return;

  if (_cmAsigStep === 1) {
    w.innerHTML = `
      <div style="display:grid;grid-template-columns:220px 1fr;gap:24px;min-height:300px">
        <div style="display:flex;flex-direction:column;gap:0">
          <div class="rep-cm-step active"><span class="rep-cm-step-num">1</span><span class="rep-cm-step-label">Descargar plantilla</span></div>
          <div class="rep-cm-step"><span class="rep-cm-step-num">2</span><span class="rep-cm-step-label">Subir archivo</span></div>
          <div class="rep-cm-step"><span class="rep-cm-step-num">3</span><span class="rep-cm-step-label">Revisar preview</span></div>
          <div class="rep-cm-step"><span class="rep-cm-step-num">4</span><span class="rep-cm-step-label">Confirmar</span></div>
        </div>
        <div style="text-align:center;padding:30px 0">
          <div style="font-size:48px;margin-bottom:12px">&#128203;</div>
          <h3 style="margin-bottom:8px">Paso 1: Descargar Plantilla</h3>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:8px">Columnas: TICKET, FECHA_ASIGNACION, MOTIVO, COD_INV, SERIE, USO_EQUIPO, TIPO_DESTINO, DNI_COLABORADOR, SITIO_CODIGO, ACTA_ENTREGA, FECHA_FIN_PRESTAMO, OBSERVACIONES</p>
          <p style="color:var(--text-muted);font-size:12px;margin-bottom:4px">MOTIVO: INGRESO NUEVO, ASIGNACION, REEMPLAZO, RENOVACION, PRESTAMO, REPOSICION DANO FISICO, REPOSICION ROBO</p>
          <p style="color:var(--text-muted);font-size:12px;margin-bottom:20px">USO_EQUIPO: EP-ADMIN (equipo principal), ADIC-ERG (accesorio ergonómico), ADICIONAL (otro)</p>
          <button class="btn btn-primary" onclick="_descargarPlantillaAsig();_cmAsigStep=2;_renderCmAsigStep()">&#128203; Descargar Plantilla</button>
          <button class="btn btn-secondary" onclick="_cmAsigStep=2;_renderCmAsigStep()" style="margin-left:8px">Ya tengo la plantilla &rarr;</button>
        </div>
      </div>
    `;
  } else if (_cmAsigStep === 2) {
    w.innerHTML = `
      <div style="display:grid;grid-template-columns:220px 1fr;gap:24px;min-height:300px">
        <div style="display:flex;flex-direction:column;gap:0">
          <div class="rep-cm-step done"><span class="rep-cm-step-num">&#10003;</span><span class="rep-cm-step-label">Descargar plantilla</span></div>
          <div class="rep-cm-step active"><span class="rep-cm-step-num">2</span><span class="rep-cm-step-label">Subir archivo</span></div>
          <div class="rep-cm-step"><span class="rep-cm-step-num">3</span><span class="rep-cm-step-label">Revisar preview</span></div>
          <div class="rep-cm-step"><span class="rep-cm-step-num">4</span><span class="rep-cm-step-label">Confirmar</span></div>
        </div>
        <div style="text-align:center;padding:30px 0">
          <div class="rep-cm-dropzone" id="cmAsigDropZone" onclick="document.getElementById('cmAsigFileInput').click()">
            <div style="font-size:48px;margin-bottom:12px">&#128229;</div>
            <p style="font-weight:600;color:var(--text);margin-bottom:4px">Arrastra o selecciona tu archivo Excel</p>
            <p style="font-size:13px;color:var(--text-secondary)">.xlsx o .xls</p>
            <input type="file" id="cmAsigFileInput" accept=".xlsx,.xls" style="display:none" onchange="_procesarExcelAsig(this.files[0])">
          </div>
        </div>
      </div>
    `;
    const dz = document.getElementById('cmAsigDropZone');
    if (dz) {
      dz.ondragover = function(e) { e.preventDefault(); dz.classList.add('dragover'); };
      dz.ondragleave = function() { dz.classList.remove('dragover'); };
      dz.ondrop = function(e) { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files.length) _procesarExcelAsig(e.dataTransfer.files[0]); };
    }
  } else if (_cmAsigStep === 3) {
    _renderCmAsigPreview(w);
  } else if (_cmAsigStep === 4) {
    const validos = _cmAsigData.filter(r => r._valid).length;
    w.innerHTML = `
      <div style="text-align:center;padding:40px 0">
        <div style="font-size:48px;margin-bottom:12px">&#9989;</div>
        <h3 style="margin-bottom:8px">Confirmar Importaci&oacute;n</h3>
        <p style="color:var(--text-secondary);margin-bottom:20px">Se crear&aacute;n <strong>${validos}</strong> asignaciones.</p>
        <button class="btn btn-primary" onclick="_ejecutarCargaMasivaAsig()" style="font-size:14px;padding:12px 32px">&#128229; Importar ${validos} asignaciones</button>
        <button class="btn btn-secondary" onclick="_cmAsigStep=3;_renderCmAsigStep()" style="margin-left:8px">&larr; Volver</button>
      </div>
    `;
  }
}

function _descargarPlantillaAsig() {
  const headers = _CM_ASIG_COLS.map(c => c.excel);
  const ej1 = ['WO-08001', '2026-03-23', 'ASIGNACION', 'ENT96008388', '5CD8IU909', 'EP-ADMIN', 'COLABORADOR', 'juan.perez@empresa.com', '', 'ACT00015', '', 'Equipo principal'];
  const ej2 = ['WO-08002', '2026-03-23', 'ASIGNACION', 'ENT96008390', '5CD8IU911', 'ADIC-ERG', 'COLABORADOR', 'maria.lopez@empresa.com', '', '', '', 'Monitor adicional'];
  const ej3 = ['WO-08003', '2026-03-23', 'ASIGNACION', 'ENT96008391', '', 'ADICIONAL', 'SITIO', '', 'TDA-00001', 'ACT00020', '', 'Para tienda'];
  const ws = XLSX.utils.aoa_to_sheet([headers, ej1, ej2, ej3]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asignaciones');
  XLSX.writeFile(wb, 'Plantilla_Asignaciones_Masiva.xlsx');
  showToast('Plantilla descargada');
}

function _procesarExcelAsig(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) { showToast('Archivo vacio', 'error'); return; }

      const isLarge = rows.length > 200;

      // Mostrar progreso
      if (isLarge) {
        const container = document.getElementById('cmAsigContainer');
        if (container) container.innerHTML = `<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">⏳</div><h3>Procesando ${rows.length.toLocaleString()} filas...</h3><div id="cmAsigProgressBar" style="width:300px;height:6px;background:#e2e8f0;border-radius:3px;margin:16px auto"><div id="cmAsigProgressFill" style="width:0%;height:100%;background:#2563eb;border-radius:3px;transition:width 0.3s"></div></div><div id="cmAsigProgressText" style="font-size:12px;color:var(--text-light)">0%</div></div>`;
      }

      // Pre-indexar para O(1) lookups
      const activos = DB.get('activos');
      const colabs = DB.get('colaboradores');
      const sitios = DB.get('sitiosMoviles') || [];
      const asigExist = DB.get('asignaciones');
      const motivosValidos = new Set(['INGRESO NUEVO','ASIGNACION','REEMPLAZO','RENOVACION','PRESTAMO','REPOSICION DANO FISICO','REPOSICION ROBO','REPOSICIÓN DAÑO FÍSICO','REPOSICIÓN ROBO','ASIGNACIÓN','RENOVACIÓN','PRÉSTAMO','UPGRADE']);

      // Index: serie → activo
      const _serieToActivo = {};
      activos.forEach(a => (a.series || []).forEach(s => { if (s.serie) _serieToActivo[s.serie.toUpperCase()] = a; }));

      // Index: correo → colaborador
      const _correoToColab = {};
      colabs.forEach(c => { if (c.email) _correoToColab[c.email.toUpperCase()] = c; });

      // Index: codigo sitio → sitio
      const _codToSitio = {};
      sitios.forEach(s => { if (s.codigo) _codToSitio[s.codigo.toUpperCase()] = s; });

      // Index: series vigentes asignadas
      const _seriesVigentes = new Set();
      asigExist.forEach(a => { if (a.estado === 'Vigente' && a.serieAsignada) _seriesVigentes.add(a.serieAsignada.toUpperCase()); });

      // Index: EP-ADMIN vigente por colaborador
      const _epAdminPorColab = new Set();
      asigExist.forEach(a => {
        if (a.estado !== 'Vigente' || a.pendienteRetorno) return;
        const act = activos.find(x => x.id === a.activoId);
        if (act && getMapeoFuncional(act.tipo || act.equipo) === 'EP-ADMIN') {
          if (a.colaboradorId) _epAdminPorColab.add(a.colaboradorId);
        }
      });

      // Pre-mapear columnas
      const firstRowKeys = Object.keys(rows[0]);
      const colMap = {};
      _CM_ASIG_COLS.forEach(col => {
        colMap[col.field] = firstRowKeys.find(k => k.toUpperCase().replace(/\s+/g, '_') === col.excel) || col.excel;
      });

      _cmAsigData = [];
      const BATCH = 300;
      let idx = 0;

      function processBatch() {
        const end = Math.min(idx + BATCH, rows.length);
        for (let i = idx; i < end; i++) {
          const row = rows[i];
          const mapped = {};
          _CM_ASIG_COLS.forEach(col => {
            let val = row[colMap[col.field]];
            if (val === undefined || val === null) val = '';
            mapped[col.field] = (val instanceof Date) ? normalizeDate(val) : String(val).trim();
          });

          if (mapped.fechaAsignacion) mapped.fechaAsignacion = normalizeDate(mapped.fechaAsignacion);
          if (mapped.fechaFinPrestamo) mapped.fechaFinPrestamo = normalizeDate(mapped.fechaFinPrestamo);

          const errors = [];
          const ticket = (mapped.ticket || '').toUpperCase();
          const motivo = (mapped.motivo || '').toUpperCase();
          const codInv = (mapped.codInv || '').toUpperCase();
          const serie = (mapped.serie || '').toUpperCase();
          const tipoDest = (mapped.tipoDestino || 'COLABORADOR').toUpperCase();
          const correoColab = (mapped.correoColaborador || '').trim().toUpperCase();
          const sitioCod = (mapped.sitioCodigo || '').toUpperCase();
          const isPrestamo = motivo.includes('PRESTAMO');

          if (!motivo || !motivosValidos.has(motivo)) errors.push('MOTIVO invalido');
          if (!serie) errors.push('SERIE requerida');

          // Buscar activo por SERIE O(1)
          let activo = serie ? _serieToActivo[serie] || null : null;
          if (serie && !activo) errors.push('Serie no encontrada: ' + serie);
          else if (serie && _seriesVigentes.has(serie)) errors.push('Serie ya asignada (vigente)');

          // Validar destino O(1)
          let colab = null, sitio = null;
          if (tipoDest === 'SITIO') {
            if (!sitioCod) errors.push('SITIO_CODIGO requerido');
            else {
              sitio = _codToSitio[sitioCod] || null;
              if (!sitio) errors.push('Sitio no encontrado: ' + sitioCod);
            }
          } else {
            if (!correoColab) errors.push('CORREO_COLABORADOR requerido');
            else {
              colab = _correoToColab[correoColab] || null;
              if (!colab) errors.push('Colaborador no encontrado: ' + correoColab);
              else if (colab.estado !== 'Activo') errors.push('Colaborador no activo');
            }
          }

          if (isPrestamo && !mapped.fechaFinPrestamo) errors.push('FECHA_FIN_PRESTAMO requerida para prestamo');

          const usoEquipo = (mapped.usoEquipo || '').toUpperCase();
          if (usoEquipo && !['EP-ADMIN', 'ADIC-ERG', 'ADICIONAL'].includes(usoEquipo))
            errors.push('USO_EQUIPO invalido (EP-ADMIN, ADIC-ERG o ADICIONAL)');
          const _usoFinal = usoEquipo || (activo ? getMapeoFuncional(activo.tipo || activo.equipo) : 'ADICIONAL');

          if (colab && !motivo.includes('REEMPLAZO') && !motivo.includes('RENOVACION')) {
            if (_usoFinal === 'EP-ADMIN' && _epAdminPorColab.has(colab.id))
              errors.push('Colaborador ya tiene EP-ADMIN asignado');
          }

          _cmAsigData.push({
            ...mapped,
            ticket, motivo, codInv, serie, tipoDest, correoColab, sitioCod,
            _usoEquipo: _usoFinal,
            _activo: activo || null,
            _colab: colab || null,
            _sitio: sitio || null,
            _row: i + 2,
            _errors: errors,
            _valid: errors.length === 0
          });
        }
        idx = end;

        if (isLarge) {
          const pct = Math.round((idx / rows.length) * 90);
          const fill = document.getElementById('cmAsigProgressFill');
          const txt = document.getElementById('cmAsigProgressText');
          if (fill) fill.style.width = pct + '%';
          if (txt) txt.textContent = `Validando... ${idx.toLocaleString()} / ${rows.length.toLocaleString()}`;
        }

        if (idx < rows.length) {
          setTimeout(processBatch, 0);
        } else {
          setTimeout(() => {
            // Validar duplicados EP-ADMIN intra-archivo
            const _epPorColab = {};
            _cmAsigData.forEach(r => {
              if (!r._valid || !r._colab) return;
              const mot = (r.motivo || '').toUpperCase();
              if (mot.includes('REEMPLAZO') || mot.includes('RENOVACION')) return;
              if (r._usoEquipo !== 'EP-ADMIN') return;
              const cKey = r._colab.id;
              if (_epPorColab[cKey]) {
                r._errors.push('Duplicado EP-ADMIN para mismo colaborador (fila ' + _epPorColab[cKey] + ')');
                r._valid = false;
              } else {
                _epPorColab[cKey] = r._row;
              }
            });

            _cmAsigStep = 3;
            _renderCmAsigStep();
          }, 0);
        }
      }

      if (isLarge) {
        setTimeout(processBatch, 50);
      } else {
        processBatch();
      }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };
  reader.readAsArrayBuffer(file);
}

let _cmAsigShowOnlyErrors = false;
let _cmAsigPage = 1;
const _CMASIG_PAGE_SIZE = 15;

function _renderCmAsigPreview(w) {
  const total = _cmAsigData.length;
  const validos = _cmAsigData.filter(r => r._valid).length;
  const errores = total - validos;

  const filteredData = _cmAsigShowOnlyErrors ? _cmAsigData.filter(r => !r._valid) : _cmAsigData;
  const filteredTotal = filteredData.length;
  const tp = Math.max(1, Math.ceil(filteredTotal / _CMASIG_PAGE_SIZE));
  if (_cmAsigPage > tp) _cmAsigPage = tp;
  const start = (_cmAsigPage - 1) * _CMASIG_PAGE_SIZE;
  const pageData = filteredData.slice(start, start + _CMASIG_PAGE_SIZE);

  w.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#f0fdf4;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#16a34a">${validos}</div>
        <div style="font-size:11px;color:#15803d">Válidos</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:${errores > 0 ? '#fef2f2' : '#f8fafc'};border-radius:8px;text-align:center;cursor:${errores > 0 ? 'pointer' : 'default'}" ${errores > 0 ? 'onclick="_cmAsigShowOnlyErrors=!_cmAsigShowOnlyErrors;_cmAsigPage=1;_renderCmAsigPreview(document.getElementById(\'cmAsigContainer\'))"' : ''}>
        <div style="font-size:22px;font-weight:700;color:${errores > 0 ? '#dc2626' : '#94a3b8'}">${errores}</div>
        <div style="font-size:11px;color:${errores > 0 ? '#b91c1c' : '#64748b'}">Con errores ${_cmAsigShowOnlyErrors ? '(filtrado)' : ''}</div>
      </div>
      <div style="flex:1;min-width:100px;padding:10px 14px;background:#f8fafc;border-radius:8px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#334155">${total}</div>
        <div style="font-size:11px;color:#64748b">Total filas</div>
      </div>
    </div>

    ${errores > 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#991b1b;display:flex;align-items:center;justify-content:space-between">
      <span>⚠️ <strong>${errores} fila(s) con error</strong> no se importarán.</span>
      <button class="btn btn-sm" onclick="_cmAsigShowOnlyErrors=!_cmAsigShowOnlyErrors;_cmAsigPage=1;_renderCmAsigPreview(document.getElementById('cmAsigContainer'))" style="font-size:11px;padding:3px 10px;background:${_cmAsigShowOnlyErrors ? '#dc2626' : '#fff'};color:${_cmAsigShowOnlyErrors ? '#fff' : '#dc2626'};border:1px solid #dc2626;border-radius:4px;cursor:pointer">${_cmAsigShowOnlyErrors ? '📋 Ver todos' : '⚠ Ver solo errores'}</button>
    </div>` : ''}

    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;font-size:11px;border-collapse:collapse">
        <thead><tr style="background:#f8fafc;position:sticky;top:0">
          <th style="padding:8px 6px;text-align:left;font-size:10px;color:#64748b">#</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;color:#64748b">✓</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;background:#fef2f2;color:#991b1b;min-width:200px">ERROR</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;color:#64748b">TICKET</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;color:#64748b">MOTIVO</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;color:#64748b">COD. INV</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;color:#64748b">SERIE</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;color:#64748b">USO EQUIPO</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;color:#64748b">DESTINO</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;color:#64748b">ACTA</th>
        </tr></thead>
        <tbody>
          ${pageData.map(r => {
            const destLabel = r.tipoDest === 'SITIO' ? (r._sitio ? esc(r._sitio.nombre || r.sitioCod) : esc(r.sitioCod)) : (r._colab ? esc(_fullName(r._colab)) : esc(r.correoColab));
            const _usoEq = r._usoEquipo || '';
            const _usoColor = _usoEq === 'EP-ADMIN' ? 'background:#dbeafe;color:#1d4ed8' : _usoEq === 'ADIC-ERG' ? 'background:#fef3c7;color:#92400e' : 'background:#f1f5f9;color:#64748b';
            return '<tr style="border-bottom:1px solid #f1f5f9;' + (!r._valid ? 'background:#fef2f2' : '') + '">'
              + '<td style="padding:6px;color:var(--text-light)">' + r._row + '</td>'
              + '<td style="padding:6px;text-align:center">' + (r._valid ? '<span style="color:#16a34a;font-weight:700">✓</span>' : '<span style="color:#dc2626;font-weight:700">✗</span>') + '</td>'
              + '<td style="padding:6px;font-size:10px;color:#dc2626;font-weight:' + (r._errors.length ? '600' : 'normal') + '">' + (r._errors.length > 0 ? r._errors.map(e => esc(e)).join(' | ') : '<span style="color:#16a34a">—</span>') + '</td>'
              + '<td style="padding:6px;font-weight:600">' + esc(r.ticket) + '</td>'
              + '<td style="padding:6px">' + esc(r.motivo) + '</td>'
              + '<td style="padding:6px;font-family:monospace">' + esc(r.codInv || '—') + '</td>'
              + '<td style="padding:6px;font-family:monospace">' + esc(r.serie || '—') + '</td>'
              + '<td style="padding:6px"><span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;' + _usoColor + '">' + esc(_usoEq || '—') + '</span></td>'
              + '<td style="padding:6px">' + destLabel + '</td>'
              + '<td style="padding:6px">' + (r.actaEntrega ? '<span style="color:#16a34a;font-weight:600">' + esc(r.actaEntrega) + '</span>' : '<span style="color:#94a3b8">—</span>') + '</td>'
              + '</tr>';
          }).join('')}
        </tbody>
      </table>
    </div>

    ${tp > 1 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;color:var(--text-light)">
        <span>Mostrando ${start + 1}–${Math.min(start + _CMASIG_PAGE_SIZE, filteredTotal)} de ${filteredTotal}${_cmAsigShowOnlyErrors ? ' (solo errores)' : ''}</span>
        <div style="display:flex;gap:4px">
          ${_cmAsigPage > 1 ? '<button class="btn btn-sm" onclick="_cmAsigPage--;_renderCmAsigPreview(document.getElementById(\'cmAsigContainer\'))" style="font-size:11px;padding:3px 8px">‹ Ant</button>' : ''}
          <span style="padding:3px 8px;font-weight:600">${_cmAsigPage} / ${tp}</span>
          ${_cmAsigPage < tp ? '<button class="btn btn-sm" onclick="_cmAsigPage++;_renderCmAsigPreview(document.getElementById(\'cmAsigContainer\'))" style="font-size:11px;padding:3px 8px">Sig ›</button>' : ''}
        </div>
      </div>
    ` : ''}

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
      <button class="btn btn-secondary" onclick="_cmAsigStep=2;_cmAsigData=[];_renderCmAsigStep()">&larr; Subir otro archivo</button>
      ${validos > 0 ? '<button class="btn btn-primary" onclick="_cmAsigStep=4;_renderCmAsigStep()">Continuar con ' + validos + ' v&aacute;lidos &rarr;</button>' : '<span style="color:#dc2626;font-weight:600">No hay registros v&aacute;lidos</span>'}
    </div>
  `;
}

async function _ejecutarCargaMasivaAsig() {
  const validos = _cmAsigData.filter(r => r._valid);
  if (validos.length === 0) return;

  const activos = DB.get('activos');
  const asig = DB.get('asignaciones');
  const bitacora = DB.get('bitacoraMovimientos') || []; // ← UNA sola lectura
  const now = new Date();
  const timeStr = 'T' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');

  // Pre-calcular el próximo ID una vez (evita O(n²) de nextId dentro del loop)
  let _nextAsigId = nextId(asig);
  let _nextBitId = nextId(bitacora);

  // Índice de series vigentes para búsqueda rápida O(1) en reemplazos
  const _vigenteBySerie = new Map();
  asig.forEach(a => {
    if (a.estado === 'Vigente') {
      _vigenteBySerie.set(a.activoId + '||' + (a.serieAsignada || '').toUpperCase(), a);
    }
  });

  const totalValidos = validos.length;
  const BATCH_SIZE = 200;
  let processed = 0;

  // Procesar en batches para no bloquear la UI
  function processBatch(startIdx) {
    const endIdx = Math.min(startIdx + BATCH_SIZE, totalValidos);

    for (let i = startIdx; i < endIdx; i++) {
      const r = validos[i];
      const activo = r._activo;
      if (!activo) continue;
      const colab = r._colab;
      const sitio = r._sitio;
      const fecha = (r.fechaAsignacion || today()) + timeStr;
      const motivoUp = (r.motivo || '').toUpperCase();
      const isPrestamo = motivoUp.includes('PRESTAMO');
      const isReemplazo = motivoUp.includes('REEMPLAZO') || motivoUp.includes('RENOVACION') || motivoUp.includes('REPOSICION');

      // Mark old assignment as pending return if REEMPLAZO
      if (isReemplazo && r.serie) {
        const key = activo.id + '||' + (r.serie || '').toUpperCase();
        const oldAsig = _vigenteBySerie.get(key);
        if (oldAsig) {
          oldAsig.pendienteRetorno = true;
          oldAsig.fechaReemplazo = fecha;
          oldAsig.motivoReemplazo = r.motivo;
          oldAsig.ticketReemplazo = r.ticket;
        }
      }

      // Crear asignación directamente (sin nextId que recorre todo el array)
      const nuevaAsig = upperFields({
        id: _nextAsigId++,
        activoId: activo.id,
        activoCodigo: activo.codigo,
        activoTipo: activo.tipo,
        activoMarca: activo.marca,
        activoModelo: activo.modelo,
        serieAsignada: r.serie || '',
        colaboradorId: colab ? colab.id : null,
        colaboradorNombre: colab ? _fullName(colab) : (sitio ? _buildSitioNombre(sitio) : ''),
        correoColab: colab ? (colab.email || '') : '',
        area: colab ? colab.area : (sitio ? (sitio.area || '') : ''),
        tipoDestino: sitio ? 'sitio' : 'colaborador',
        sitioId: sitio ? sitio.id : null,
        sitioNombre: sitio ? _buildSitioNombre(sitio) : '',
        fechaAsignacion: fecha || today(),
        tipoAsignacion: r.motivo,
        motivo: r.motivo,
        ticket: (r.ticket || '').toUpperCase(),
        observaciones: r.observaciones || '',
        estado: 'Vigente',
        fechaFinPrestamo: isPrestamo ? (r.fechaFinPrestamo || '') : '',
        actaEntrega: (r.actaEntrega || '').toUpperCase().trim(),
        usoEquipo: r._usoEquipo || ''
      });
      asig.push(nuevaAsig);

      // Update activo estado (1 activo = 1 serie)
      activo.estado = 'Asignado';
      setResponsable(activo, colab, sitio);

      // Crear bitácora en memoria (sin DB.get/set en cada iteración)
      let ticketVal = (r.ticket || '').toUpperCase();
      bitacora.unshift({
        id: _nextBitId++,
        movimiento: 'SALIDA',
        almacen: (activo.ubicacion || 'Almacen TI').toUpperCase(),
        tipoEquipo: (activo.tipo || '').toUpperCase(),
        equipo: (activo.equipo || activo.tipo || '').toUpperCase(),
        modelo: (activo.modelo || '').toUpperCase(),
        serie: (r.serie || '').toUpperCase(),
        codInv: (activo.codInv || '').toUpperCase(),
        correo: colab ? (colab.email || '') : (sitio ? _buildSitioNombre(sitio) : ''),
        motivo: (r.motivo || '').toUpperCase(),
        gestor: currentUser ? (currentUser.usuario || currentUser.nombre) : 'Sistema',
        ticket: ticketVal,
        estadoAsignacion: r.actaEntrega ? 'ATENDIDO' : 'PENDIENTE',
        actaCorrelativo: r.actaEntrega ? (r.actaEntrega || '').toUpperCase().trim() : '',
        fechaRegistro: today()
      });
    }

    processed = endIdx;

    if (processed < totalValidos) {
      // Ceder el hilo al browser para no bloquear UI
      setTimeout(() => processBatch(processed), 0);
    } else {
      // Todo procesado — UN solo write al final
      DB.set('activos', activos);
      DB.set('asignaciones', asig);
      DB.set('bitacoraMovimientos', bitacora);
      addMovimiento('Carga Masiva Asignaciones', totalValidos + ' asignaciones importadas desde Excel');

      _cmAsigData = [];
      _cmAsigStep = 1;
      closeModal();
      showToast(totalValidos + ' asignaciones importadas correctamente');
      renderAsignacion(document.getElementById('contentArea'));
    }
  }

  // Iniciar procesamiento por batches
  processBatch(0);
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
      const _ci = g.serieAsignada ? (activos.find(a => a.id === g.activoId)?.series?.find(s => s.serie === g.serieAsignada)?.codInv || '') : '';
      equipRows += `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${esc(g.activoTipo || '')} ${esc((activos.find(a=>a.id===g.activoId)||{}).equipo || '')}</td>
        <td>${esc(g.activoMarca || '')}</td>
        <td>${esc(g.activoModelo || '')}</td>
        <td>${esc(g.serieAsignada || 'N/A')}</td>
        <td>${esc(_ci || 'N/A')}</td>
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
          const dInv = d.serieAsignada ? (activos.find(a => a.id === d.activoId)?.series?.find(s => s.serie === d.serieAsignada)?.codInv || '') : '';
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
          const dInv = d.serieAsignada ? (activos.find(a => a.id === d.activoId)?.series?.find(s => s.serie === d.serieAsignada)?.codInv || '') : '';
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
    <tr><td class="lbl">USUARIO:</td><td colspan="3">${esc(_fullName(colab) || record.colaboradorNombre)}</td><td class="lbl" style="width:100px">TICKET:</td><td style="width:160px;font-family:monospace">${esc(record.ticket || '')}</td></tr>
    <tr><td class="lbl">EMAIL:</td><td colspan="3">${esc(colab.email || record.correoColab || '')}</td><td class="lbl">FECHA ENTREGA:</td><td>${fechaEntrega}</td></tr>
    <tr><td class="lbl">CARGO:</td><td>${esc(colab.puesto || colab.tipoPuesto || '')}</td><td class="lbl" style="width:60px">AREA:</td><td colspan="3">${esc(colab.area || record.area || '')}</td></tr>
    <tr><td class="lbl">LOCAL:</td><td colspan="5">${esc(colab.ubicacionFisica || colab.ubicacion || '')}</td></tr>
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
    <div class="signature-col"><div class="sig-line">Usuario / DNI</div><div class="sig-name">${esc(_fullName(colab) || record.colaboradorNombre)}</div></div>
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

  // Guardar datos para copiar al portapapeles
  window._detAsigCopyData = { ticket: first.ticket, fecha: first.fechaAsignacion, colaborador: first.colaboradorNombre, correo: first.correoColab || '—', motivo: first.tipoAsignacion || first.motivo || '—', area: colab.area || first.area || '—', equipos: grupo };

  openModal(_detTitle, `
    <div style="display:flex;flex-direction:column;gap:16px">
      <!-- Botón copiar -->
      <button onclick="_copyDetalleAsignacion()" title="Copiar detalle para correo"
        style="position:absolute;top:52px;right:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:12px;color:#2563eb;font-weight:600;transition:all .15s;z-index:10"
        onmouseover="this.style.background='#dbeafe';this.style.borderColor='#93c5fd'" onmouseout="this.style.background='#eff6ff';this.style.borderColor='#bfdbfe'"
        id="btnCopyDetAsig">
        <span style="font-size:14px">📋</span> Copiar
      </button>
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
            const cls = up === 'NUEVO' ? 'badge-success' : up === 'USADO' ? 'badge-info' : ['REPARACIÓN','GARANTÍA'].includes(up) ? 'badge-warning' : 'badge-danger';
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

function _copyDetalleAsignacion() {
  const d = window._detAsigCopyData;
  if (!d) return;

  // Obtener cod inventario de cada equipo
  const activos = DB.get('activos');

  const cs = 'padding:4px 10px;font-size:12px;font-family:Calibri,Arial,sans-serif;border:1px solid #d0d5dd';
  const ths = 'padding:6px 10px;font-size:12px;font-family:Calibri,Arial,sans-serif;border:1px solid #1e3a8a;text-align:left';

  const equiposRowsHTML = d.equipos.map(a => {
    const act = activos.find(x => x.id === a.activoId);
    const _ci = (act && act.codInv) ? act.codInv : '—';
    return '<tr>'
      + '<td style="' + cs + '">' + esc(a.activoTipo || '') + '</td>'
      + '<td style="' + cs + '">' + esc(a.activoMarca || '') + '</td>'
      + '<td style="' + cs + '">' + esc(a.activoModelo || '') + '</td>'
      + '<td style="' + cs + '">' + esc(a.serieAsignada || '—') + '</td>'
      + '<td style="' + cs + '">' + esc(_ci) + '</td>'
      + '</tr>';
  }).join('');

  const html = '<div style="font-family:Calibri,Arial,sans-serif;font-size:12px">'
    + '<table style="border-collapse:collapse;margin-bottom:10px">'
    + '<tr><td style="padding:2px 8px 2px 0;font-weight:700;color:#334155">Ticket:</td><td style="padding:2px 0">' + esc(d.ticket) + '</td></tr>'
    + '<tr><td style="padding:2px 8px 2px 0;font-weight:700;color:#334155">Motivo:</td><td style="padding:2px 0">' + esc(d.motivo) + '</td></tr>'
    + '<tr><td style="padding:2px 8px 2px 0;font-weight:700;color:#334155">Correo:</td><td style="padding:2px 0">' + esc(d.correo) + '</td></tr>'
    + '</table>'
    + '<div style="font-weight:700;margin-bottom:6px;color:#334155">Equipos asignados:</div>'
    + '<table style="border-collapse:collapse">'
    + '<tr bgcolor="#1e3a5f"><td bgcolor="#1e3a5f" style="' + ths + ';color:white;mso-style-textfill-fill-color:white"><b style="color:white"><font color="white" style="color:white">TIPO</font></b></td><td bgcolor="#1e3a5f" style="' + ths + ';color:white"><b style="color:white"><font color="white" style="color:white">MARCA</font></b></td><td bgcolor="#1e3a5f" style="' + ths + ';color:white"><b style="color:white"><font color="white" style="color:white">MODELO</font></b></td><td bgcolor="#1e3a5f" style="' + ths + ';color:white"><b style="color:white"><font color="white" style="color:white">SERIE</font></b></td><td bgcolor="#1e3a5f" style="' + ths + ';color:white"><b style="color:white"><font color="white" style="color:white">COD.INV</font></b></td></tr>'
    + equiposRowsHTML
    + '</table></div>';

  const plainText = 'Ticket: ' + d.ticket + '\nMotivo: ' + d.motivo + '\nCorreo: ' + d.correo + '\n\nEquipos asignados:\n'
    + d.equipos.map(a => {
        const act = activos.find(x => x.id === a.activoId);
        const _ci = (act && act.codInv) ? act.codInv : '—';
        return (a.activoTipo || '') + ' | ' + (a.activoMarca || '') + ' | ' + (a.activoModelo || '') + ' | ' + (a.serieAsignada || '—') + ' | ' + _ci;
      }).join('\n');

  const _copyOk = () => {
    const btn = document.getElementById('btnCopyDetAsig');
    if (btn) {
      btn.innerHTML = '<span style="font-size:14px">✅</span> Copiado';
      btn.style.background = '#dcfce7';
      btn.style.borderColor = '#86efac';
      btn.style.color = '#16a34a';
      setTimeout(() => {
        if (btn) {
          btn.innerHTML = '<span style="font-size:14px">📋</span> Copiar';
          btn.style.background = '#eff6ff';
          btn.style.borderColor = '#bfdbfe';
          btn.style.color = '#2563eb';
        }
      }, 2000);
    }
    showToast('Detalle copiado al portapapeles');
  };

  try {
    const blobHtml = new Blob([html], { type: 'text/html' });
    const blobText = new Blob([plainText], { type: 'text/plain' });
    navigator.clipboard.write([new ClipboardItem({
      'text/html': blobHtml,
      'text/plain': blobText
    })]).then(_copyOk).catch(() => {
      navigator.clipboard.writeText(plainText).then(_copyOk);
    });
  } catch (e) {
    navigator.clipboard.writeText(plainText).then(_copyOk);
  }
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
  const colabs = DB.get('colaboradores');
  const sitios = DB.get('sitiosMoviles');
  const asigFinal = asignaciones.filter(a => !ids.includes(a.id));
  grupo.forEach(a => {
    const activo = activos.find(x => x.id === a.activoId);
    if (activo && a.estado === 'Vigente') {
      const otrasVigentes = asigFinal.filter(o => o.activoId === a.activoId && o.estado === 'Vigente');
      if (otrasVigentes.length === 0) {
        activo.estado = 'Disponible';
        activo.responsable = '';
      } else {
        // El activo sigue asignado a otro colaborador/sitio
        activo.estado = 'Asignado';
        const otraAsig = otrasVigentes[0];
        const otroColab = otraAsig.colaboradorId ? colabs.find(c => c.id === otraAsig.colaboradorId) : null;
        const otroSitio = otraAsig.sitioId ? sitios.find(s => s.id === otraAsig.sitioId) : null;
        setResponsable(activo, otroColab, otroSitio);
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
  const subOpciones = { 'DISPONIBLE': ['NUEVO', 'USADO'], 'MANTENIMIENTO': ['REPARACIÓN', 'GARANTÍA'], 'BAJA': ['DESTRUCCIÓN', 'DONACIÓN', 'VENTA'], 'NO RECUPERABLE': [] };
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
          activo.estado = 'Mantenimiento'; activo.estadoEquipo = subDestino || 'REPARACIÓN'; activo.responsable = ''; break;
        case 'BAJA':
          activo.estado = 'Baja'; activo.motivoBaja = subDestino || ''; activo.responsable = ''; break;
        case 'NO RECUPERABLE':
          activo.estado = 'Baja'; activo.motivoBaja = 'CESE-NO RECUPERABLE'; activo.responsable = ''; break;
      }
    }
    // Marcar serie específica como Baja si es NO RECUPERABLE
    if (destino === 'NO RECUPERABLE' && a.serieAsignada && activo.series && activo.series.length > 0) {
      const serieObj = activo.series.find(s => (s.serie || '').toUpperCase().trim() === (a.serieAsignada || '').toUpperCase().trim());
      if (serieObj) serieObj.estadoSerie = 'Baja';
    }
  }

  DB.set('asignaciones', asig);
  DB.set('activos', activos);

  // Si es NO RECUPERABLE: registrar directo en historial de bajas
  if (destino === 'NO RECUPERABLE' && activo) {
    const historial = DB.get('historialBajas');
    historial.unshift({
      id: nextId(historial),
      activoId: activo.id,
      activoCodigo: activo.codigo || a.activoCodigo,
      activoTipo: activo.equipo || activo.tipo || a.activoTipo,
      marca: activo.marca || '',
      modelo: activo.modelo || '',
      serie: a.serieAsignada || '',
      codInv: activo.codInv || '',
      almacen: activo.ubicacion || '',
      estadoEquipo: 'NO RECUPERABLE',
      motivoBaja: 'CESE-NO RECUPERABLE',
      costo: activo.costo || 0,
      fechaCompra: activo.fechaCompra || '',
      antiguedad: '',
      responsable: a.colaboradorNombre || '',
      observaciones: 'Equipo no recuperable por cese de colaborador',
      fechaSalida: today(),
      numGuia: '',
      guiaArchivo: '',
      etapaBaja: '',
      estadoBaja: 'Ejecutada',
      fechaAprobacion: today(),
      solicitante: currentUser ? currentUser.nombre : 'Sistema'
    });
    DB.set('historialBajas', historial);
  }

  addMovimiento('Devolución', `${a.activoCodigo} → ${destino}${subDestino ? ' (' + subDestino + ')' : ''} — devuelto por ${a.colaboradorNombre}`);

  // Auto-registrar en bitácora
  if (activo) {
    const _bitMotivo = destino === 'NO RECUPERABLE' ? 'CESE-NO RECUPERABLE' : 'CESE';
    _autoBitacora({
      movimiento: destino === 'NO RECUPERABLE' ? 'BAJA' : 'INGRESO',
      almacen: (activo.ubicacion || 'Almacen TI'),
      tipoEquipo: activo.tipo || a.activoTipo || '',
      equipo: activo.equipo || activo.tipo || '',
      modelo: activo.modelo || a.activoModelo || '',
      serie: a.serieAsignada || '',
      codInv: activo.codInv || '',
      correo: a.correoColab || '',
      motivo: _bitMotivo
    });
  }

  closeModal();
  showToast('Activo procesado correctamente');
  renderCeses(document.getElementById('contentArea'));
}

/* ═══════════════════════════════════════════════════════
   COLABORADORES - SITIOS MÓVILES
   ═══════════════════════════════════════════════════════ */
let _sitioSearch = '';
let _sitioActiveFilters = {};
let _sitioFilterMenuOpen = false;

const _SITIO_FILTER_OPTIONS = [
  { key: 'estado', label: 'Estado' },
  { key: 'sede',   label: 'Sede' },
  { key: 'area',   label: 'Área' },
  { key: 'piso',   label: 'Piso' }
];

function _buildSitioNombre(s) {
  return (s.sede || '') + ' - Piso ' + (s.piso || '?') + ' - Ubicación ' + (s.ubicacion || '?');
}

function renderSitiosMoviles(el) {
  const sitios = DB.get('sitiosMoviles');
  const totalActivos = sitios.filter(s => (s.estado || '').toUpperCase() === 'ACTIVO').length;
  const totalInactivos = sitios.filter(s => (s.estado || '').toUpperCase() !== 'ACTIVO').length;

  const _tabStyle = (active) => 'padding:10px 24px;font-size:13px;font-weight:600;border:none;cursor:pointer;border-bottom:3px solid ' + (active ? '#2563eb' : 'transparent') + ';color:' + (active ? '#2563eb' : '#64748b') + ';background:none;transition:all .15s';

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Padrón de Colaboradores</h1>
        <div class="subtitle">Directorio general de todos los colaboradores</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="_openCargaMasivaSitiosModal()" style="font-size:13px">📥 Carga Masiva</button>
        <button class="btn btn-primary" onclick="openSitioModal()">+ Nuevo Sitio</button>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:20px">
      <button onclick="_switchPadronTab('empleados')" style="${_tabStyle(false)}">👥 Empleados</button>
      <button onclick="_switchPadronTab('sitios')" style="${_tabStyle(true)}">📍 Sitios Móviles</button>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon blue">📍</div></div>
        <div class="stat-value">${sitios.length}</div>
        <div class="stat-label">Total sitios</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon green">✅</div></div>
        <div class="stat-value">${totalActivos}</div>
        <div class="stat-label">Activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon red">⛔</div></div>
        <div class="stat-value">${totalInactivos}</div>
        <div class="stat-label">Inactivos</div>
      </div>
    </div>

    <div class="table-toolbar">
      <div class="search-box" style="position:relative">
        <span class="search-icon">🔍</span>
        <input type="text" id="sitioSearchInput" placeholder="Buscar por sede, área, piso, ubicación..."
               value="${esc(_sitioSearch)}"
               oninput="_onSitioSearch(this.value)">
        <span id="sitioSearchClear" onclick="_clearSitioSearch()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;color:#94a3b8;font-size:16px;font-weight:700;width:24px;height:24px;display:${_sitioSearch ? 'flex' : 'none'};align-items:center;justify-content:center;border-radius:50%;transition:all .15s" onmouseover="this.style.background='#fee2e2';this.style.color='#dc2626'" onmouseout="this.style.background='';this.style.color='#94a3b8'" title="Limpiar búsqueda">✕</span>
      </div>
    </div>
    <div id="sitioFiltersBar" style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap"></div>

    <div id="sitioTableWrap"></div>
  `;
  _renderSitioFiltersBar();
  _renderSitioTable();
}

function _onSitioSearch(val) {
  _sitioSearch = val;
  const cb = document.getElementById('sitioSearchClear');
  if (cb) cb.style.display = val ? 'flex' : 'none';
  resetPage('sitios');
  debounceSearch('sitio', _renderSitioTable);
}

function _clearSitioSearch() {
  _sitioSearch = '';
  const input = document.getElementById('sitioSearchInput');
  if (input) { input.value = ''; input.focus(); }
  const cb = document.getElementById('sitioSearchClear');
  if (cb) cb.style.display = 'none';
  resetPage('sitios');
  _renderSitioTable();
}

function _renderSitioFiltersBar() {
  const bar = document.getElementById('sitioFiltersBar');
  if (!bar) return;
  const sitios = DB.get('sitiosMoviles');

  let html = Object.keys(_sitioActiveFilters).map(key => {
    const opt = _SITIO_FILTER_OPTIONS.find(o => o.key === key);
    if (!opt) return '';
    const values = ['Todos', ...new Set(sitios.map(s => s[key] || '').filter(Boolean))].sort((a, b) => a === 'Todos' ? -1 : b === 'Todos' ? 1 : String(a).localeCompare(String(b)));
    const current = _sitioActiveFilters[key] || 'Todos';
    return '<div style="display:flex;align-items:center;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;height:34px;background:#fff">'
      + '<select onchange="_sitioActiveFilters[\'' + key + '\']=this.value;resetPage(\'sitios\');_renderSitioTable()" style="border:none;padding:0 8px 0 10px;font-size:11px;color:#334155;height:100%;cursor:pointer;background:transparent;min-width:120px">'
      + values.map(v => '<option value="' + esc(v) + '" ' + (current === v ? 'selected' : '') + '>' + (v === 'Todos' ? esc(opt.label) + ': Todos' : esc(v)) + '</option>').join('')
      + '</select>'
      + '<button onclick="_sitioRemoveFilter(\'' + key + '\')" style="border:none;background:none;cursor:pointer;padding:0 6px;color:#94a3b8;font-size:14px;height:100%;display:flex;align-items:center" onmouseover="this.style.color=\'#dc2626\'" onmouseout="this.style.color=\'#94a3b8\'">✕</button>'
      + '</div>';
  }).join('');

  const inactive = _SITIO_FILTER_OPTIONS.filter(o => !_sitioActiveFilters.hasOwnProperty(o.key));
  if (inactive.length > 0) {
    html += '<div style="position:relative;display:inline-block">'
      + '<button id="sitioFilterAddBtn" style="width:34px;height:34px;border-radius:8px;border:1px dashed #cbd5e1;background:#f8fafc;cursor:pointer;font-size:16px;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.borderColor=\'#2563eb\';this.style.color=\'#2563eb\'" onmouseout="this.style.borderColor=\'#cbd5e1\';this.style.color=\'#64748b\'" title="Agregar filtro">+</button>'
      + '<div id="sitioFilterAddMenu" style="display:' + (_sitioFilterMenuOpen ? 'block' : 'none') + ';position:absolute;top:38px;left:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:6px 0;z-index:999;min-width:180px">'
      + '<div style="padding:4px 12px 6px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Agregar filtro</div>'
      + inactive.map(o => '<div onclick="event.stopPropagation();_sitioAddFilter(\'' + o.key + '\')" style="padding:7px 12px;font-size:12px;color:#334155;cursor:pointer;display:flex;align-items:center;gap:8px" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'\'">'
        + '<span style="color:#2563eb;font-size:14px">+</span> ' + esc(o.label) + '</div>').join('')
      + '</div></div>';
  }
  bar.innerHTML = html;
  const addBtn = document.getElementById('sitioFilterAddBtn');
  if (addBtn) {
    addBtn.onclick = function(e) {
      e.stopPropagation();
      _sitioFilterMenuOpen = !_sitioFilterMenuOpen;
      const menu = document.getElementById('sitioFilterAddMenu');
      if (menu) menu.style.display = _sitioFilterMenuOpen ? 'block' : 'none';
    };
  }
}

function _sitioAddFilter(key) { _sitioActiveFilters[key] = 'Todos'; _sitioFilterMenuOpen = false; resetPage('sitios'); _renderSitioFiltersBar(); _renderSitioTable(); }
function _sitioRemoveFilter(key) { delete _sitioActiveFilters[key]; _sitioFilterMenuOpen = false; resetPage('sitios'); _renderSitioFiltersBar(); _renderSitioTable(); }

document.addEventListener('click', function(e) {
  if (_sitioFilterMenuOpen && !e.target.closest('#sitioFiltersBar')) {
    _sitioFilterMenuOpen = false;
    const m = document.getElementById('sitioFilterAddMenu');
    if (m) m.style.display = 'none';
  }
});

function _renderSitioTable() {
  const wrap = document.getElementById('sitioTableWrap');
  if (!wrap) return;
  const sitios = DB.get('sitiosMoviles');
  const asignaciones = DB.get('asignaciones');

  let filtered = sitios;

  // Filtros dinámicos
  for (const [key, val] of Object.entries(_sitioActiveFilters)) {
    if (val && val !== 'Todos') {
      filtered = filtered.filter(s => (s[key] || '').toUpperCase() === val.toUpperCase());
    }
  }

  // Búsqueda
  if (_sitioSearch) {
    const s = _sitioSearch.toLowerCase();
    filtered = filtered.filter(r =>
      (r.sede || '').toLowerCase().includes(s) ||
      (r.area || '').toLowerCase().includes(s) ||
      (r.piso || '').toLowerCase().includes(s) ||
      (r.ubicacion || '').toLowerCase().includes(s) ||
      _buildSitioNombre(r).toLowerCase().includes(s)
    );
  }

  const pageItems = pagSlice(filtered, 'sitios');

  wrap.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>ID</th>
            <th>Nombre del Sitio</th>
            <th>Sede</th>
            <th>Área</th>
            <th>Piso</th>
            <th>Ubicación</th>
            <th>Activos Asig.</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0
              ? '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📍</div><h3>Sin sitios móviles</h3><p>Crea un sitio para asignar activos a ubicaciones físicas</p></div></td></tr>'
              : pageItems.map(s => {
                  const nAsig = asignaciones.filter(a => a.estado === 'Vigente' && ((a.tipoDestino||'').toUpperCase() === 'SITIO') && a.sitioId === s.id).length;
                  return '<tr>'
                    + '<td style="font-size:12px;color:var(--text-light)">' + s.id + '</td>'
                    + '<td><div style="display:flex;align-items:center;gap:10px"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;flex-shrink:0">📍</div><strong>' + esc(_buildSitioNombre(s)) + '</strong></div></td>'
                    + '<td style="font-size:12px">' + esc(s.sede || '—') + '</td>'
                    + '<td style="font-size:12px">' + esc(s.area || '—') + '</td>'
                    + '<td style="font-size:12px;text-align:center">' + esc(s.piso || '—') + '</td>'
                    + '<td style="font-size:12px;text-align:center">' + esc(s.ubicacion || '—') + '</td>'
                    + '<td style="text-align:center"><span class="badge badge-info" style="font-size:10px">' + nAsig + '</span></td>'
                    + '<td>' + (s.estado === 'Activo'
                      ? '<span class="badge badge-success" style="font-size:10px">Activo</span>'
                      : '<span class="badge badge-danger" style="font-size:10px">Inactivo</span>') + '</td>'
                    + '<td><div class="action-btns">'
                      + '<button class="btn-icon" title="Ver detalle" onclick="_verDetalleSitio(' + s.id + ')" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe">👁️</button>'
                      + '<button class="btn-icon" title="Editar" onclick="openSitioModal(' + s.id + ')" style="background:#fef3c7;color:#d97706;border:1px solid #fde68a">✏️</button>'
                      + '<button class="btn-icon" title="Eliminar" onclick="_deleteSitio(' + s.id + ')" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca">🗑️</button>'
                    + '</div></td>'
                    + '</tr>';
                }).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">${pagFooter('sitios', filtered.length)}</div>
    </div>
  `;
}

function openSitioModal(id) {
  const sitios = DB.get('sitiosMoviles');
  const s = id ? sitios.find(x => x.id === id) : null;
  const sedes = DB.getConfig('sedesAdmin', []);
  const areas = DB.getConfig('areas', []);

  openModal(s ? 'Editar Sitio Móvil' : 'Nuevo Sitio Móvil', `
    <div class="form-grid">
      <div class="form-group">
        <label>Sede <span class="required">*</span></label>
        <select class="form-control" id="fSitSede">
          <option value="">Seleccionar...</option>
          ${optionsHTML(sedes, s?.sede)}
        </select>
      </div>
      <div class="form-group">
        <label>Área <span class="required">*</span></label>
        <select class="form-control" id="fSitArea">
          <option value="">Seleccionar...</option>
          ${optionsHTML(areas, s?.area)}
        </select>
      </div>
      <div class="form-group">
        <label>Piso <span class="required">*</span></label>
        <input class="form-control" id="fSitPiso" placeholder="Ej: 15" value="${esc(s?.piso || '')}">
      </div>
      <div class="form-group">
        <label>Ubicación <span class="required">*</span></label>
        <input class="form-control" id="fSitUbicacion" placeholder="Ej: 8" value="${esc(s?.ubicacion || '')}">
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select class="form-control" id="fSitEstado">
          <option value="Activo" ${!s || s.estado === 'Activo' ? 'selected' : ''}>Activo</option>
          <option value="Inactivo" ${s?.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>
      <div class="form-group" style="grid-column:span 2">
        <label>Observación</label>
        <textarea class="form-control" id="fSitObs" rows="2" placeholder="Observación opcional...">${esc(s?.observacion || '')}</textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveSitio(${id || 'null'})">${s ? 'Guardar' : 'Crear Sitio'}</button>
  `);
}

function saveSitio(id) {
  const sede = (document.getElementById('fSitSede') || {}).value || '';
  const area = (document.getElementById('fSitArea') || {}).value || '';
  const piso = (document.getElementById('fSitPiso') || {}).value.trim();
  const ubicacion = (document.getElementById('fSitUbicacion') || {}).value.trim();
  const estado = (document.getElementById('fSitEstado') || {}).value || 'Activo';
  const observacion = (document.getElementById('fSitObs') || {}).value.trim();

  if (!sede || !area || !piso || !ubicacion) {
    showToast('Complete sede, área, piso y ubicación', 'error');
    return;
  }

  const sitios = DB.get('sitiosMoviles');

  // Validar duplicados (sede + piso + area + ubicacion)
  const dup = sitios.find(s =>
    (s.sede || '').toUpperCase() === sede.toUpperCase() &&
    (s.area || '').toUpperCase() === area.toUpperCase() &&
    (s.piso || '').toUpperCase() === piso.toUpperCase() &&
    (s.ubicacion || '').toUpperCase() === ubicacion.toUpperCase() &&
    s.id !== id
  );
  if (dup) {
    showToast('Ya existe un sitio con esa combinación Sede + Área + Piso + Ubicación', 'error');
    return;
  }

  const _data = upperFields({ sede, area, piso, ubicacion, estado, observacion });
  _data.nombreVisible = _buildSitioNombre(_data);

  if (id) {
    const idx = sitios.findIndex(s => s.id === id);
    if (idx >= 0) sitios[idx] = { ...sitios[idx], ..._data };
  } else {
    _data.id = nextId(sitios);
    sitios.push(_data);
    addMovimiento('Nuevo Sitio', 'Sitio móvil creado: ' + _data.nombreVisible);
  }

  DB.set('sitiosMoviles', sitios);
  closeModal();
  showToast(id ? 'Sitio actualizado' : 'Sitio creado');
  renderSitiosMoviles(document.getElementById('contentArea'));
}

function _deleteSitio(id) {
  const sitios = DB.get('sitiosMoviles');
  const s = sitios.find(x => x.id === id);
  if (!s) return;
  const asigs = DB.get('asignaciones').filter(a => a.estado === 'Vigente' && ((a.tipoDestino||'').toUpperCase() === 'SITIO') && a.sitioId === id);
  if (asigs.length > 0) {
    showToast('No se puede eliminar: tiene ' + asigs.length + ' activo(s) asignado(s)', 'error');
    return;
  }
  if (!confirm('¿Eliminar el sitio "' + _buildSitioNombre(s) + '"?')) return;
  DB.set('sitiosMoviles', sitios.filter(x => x.id !== id));
  showToast('Sitio eliminado');
  renderSitiosMoviles(document.getElementById('contentArea'));
}

function _verDetalleSitio(id) {
  const sitios = DB.get('sitiosMoviles');
  const s = sitios.find(x => x.id === id);
  if (!s) return;
  const asigs = DB.get('asignaciones').filter(a => a.estado === 'Vigente' && ((a.tipoDestino||'').toUpperCase() === 'SITIO') && a.sitioId === id);
  const activos = DB.get('activos');

  const _f = (lbl, val) => val ? '<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9"><span style="font-size:10px;font-weight:600;text-transform:uppercase;color:#94a3b8;display:block;margin-bottom:2px">' + lbl + '</span><span style="font-size:14px;font-weight:700;color:#0f172a">' + esc(val) + '</span></div>' : '';

  openModal('Detalle de Sitio Móvil', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px">
        <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;flex-shrink:0">📍</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800;color:#92400e">${esc(_buildSitioNombre(s))}</div>
          <div style="font-size:12px;color:#a16207;margin-top:2px">${esc(s.area || '')}</div>
        </div>
        <span style="padding:4px 10px;border-radius:16px;font-size:10px;font-weight:700;${s.estado === 'Activo' ? 'background:#dcfce7;color:#166534' : 'background:#fef2f2;color:#991b1b'}">${esc(s.estado)}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${_f('Sede', s.sede)}
        ${_f('Área', s.area)}
        ${_f('Piso', s.piso)}
        ${_f('Ubicación', s.ubicacion)}
      </div>

      ${s.observacion ? '<div style="padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px"><span style="font-size:10px;font-weight:600;text-transform:uppercase;color:#92400e">Observación</span><p style="margin:4px 0 0;font-size:13px;color:#78350f">' + esc(s.observacion) + '</p></div>' : ''}

      <div>
        <div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:8px">Activos asignados (${asigs.length})</div>
        ${asigs.length === 0
          ? '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;background:#f8fafc;border-radius:8px">Sin activos asignados a este sitio</div>'
          : '<table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr style="background:#f8fafc"><th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Equipo</th><th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Serie</th><th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b">Ticket</th></tr></thead><tbody>'
            + asigs.map(a => {
                const act = activos.find(x => x.id === a.activoId);
                return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 10px;font-weight:600">' + esc(a.activoTipo || '') + ' ' + esc(a.activoMarca || '') + ' ' + esc(a.activoModelo || '') + '</td><td style="padding:8px 10px;font-family:monospace">' + esc(a.serieAsignada || '') + '</td><td style="padding:8px 10px;font-family:monospace;color:#7c3aed">' + esc(a.ticket || '') + '</td></tr>';
              }).join('')
            + '</tbody></table>'
        }
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
}

let _cmSitiosStep = 1;
function _openCargaMasivaSitiosModal() {
  _cargaMasivaSitiosData = [];
  _cmSitiosStep = 1;
  openModal('Carga Masiva — Sitios M&oacute;viles', '<div id="sitiosCmpContainer"></div>', `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
  _renderCmSitiosStep();
}

function _renderCmSitiosStep() {
  const w = document.getElementById('sitiosCmpContainer');
  if (!w) return;
  const _s = (active, done, n, label) => '<div class="rep-cm-step ' + (done ? 'done' : active ? 'active' : '') + '"><span class="rep-cm-step-num">' + (done ? '&#10003;' : n) + '</span><span class="rep-cm-step-label">' + label + '</span></div>';
  const steps = '<div class="rep-cm-steps">' + _s(_cmSitiosStep===1,_cmSitiosStep>1,1,'Descargar plantilla') + _s(_cmSitiosStep===2,_cmSitiosStep>2,2,'Subir archivo') + _s(_cmSitiosStep===3,_cmSitiosStep>3,3,'Revisar preview') + _s(_cmSitiosStep===4,false,4,'Confirmar') + '</div>';

  if (_cmSitiosStep === 1) {
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" style="text-align:center;padding:30px 0"><div style="font-size:48px;margin-bottom:12px">&#128203;</div><h3 style="margin-bottom:8px">Paso 1: Descargar Plantilla</h3><p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">Descarga la plantilla con el formato correcto para sitios m&oacute;viles.</p><button class="btn btn-primary" onclick="_descargarPlantillaSitios();_cmSitiosStep=2;_renderCmSitiosStep()">&#128203; Descargar Plantilla</button><button class="btn btn-secondary" onclick="_cmSitiosStep=2;_renderCmSitiosStep()" style="margin-left:8px">Ya tengo la plantilla &rarr;</button></div></div>';
  } else if (_cmSitiosStep === 2) {
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" style="text-align:center;padding:30px 0"><div class="rep-cm-dropzone" id="sitiosDropZone" onclick="document.getElementById(\'sitiosFileInput2\').click()"><div style="font-size:48px;margin-bottom:12px">&#128229;</div><p style="font-weight:600;color:var(--text);margin-bottom:4px">Arrastra o selecciona tu archivo Excel</p><p style="font-size:13px;color:var(--text-secondary)">.xlsx o .xls</p><input type="file" id="sitiosFileInput2" accept=".xlsx,.xls" style="display:none" onchange="_procesarExcelSitios(this.files[0])"></div></div></div>';
    const dz = document.getElementById('sitiosDropZone');
    if (dz) { dz.ondragover = e => { e.preventDefault(); dz.classList.add('dragover'); }; dz.ondragleave = () => dz.classList.remove('dragover'); dz.ondrop = e => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files.length) _procesarExcelSitios(e.dataTransfer.files[0]); }; }
  } else if (_cmSitiosStep === 3) {
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" id="sitiosPreviewWrap"></div></div>';
    _renderCargaMasivaSitiosPreview();
  } else if (_cmSitiosStep === 4) {
    const validos = _cargaMasivaSitiosData.filter(r => r._valid).length;
    w.innerHTML = '<div class="rep-cm-layout">' + steps + '<div class="rep-cm-work" style="text-align:center;padding:30px 0"><div style="font-size:48px;margin-bottom:12px">&#9989;</div><h3 style="margin-bottom:8px">Confirmar Importaci&oacute;n</h3><p style="color:var(--text-secondary);margin-bottom:20px">Se importar&aacute;n <strong>' + validos + '</strong> sitios m&oacute;viles.</p><button class="btn btn-primary" onclick="_ejecutarCargaMasivaSitios()" style="font-size:14px;padding:12px 32px">&#128229; Importar ' + validos + ' sitios</button><button class="btn btn-secondary" onclick="_cmSitiosStep=3;_renderCmSitiosStep()" style="margin-left:8px">&larr; Volver</button></div></div>';
  }
}

function _descargarPlantillaSitios() {
  const headers = ['SEDE', 'AREA', 'PISO', 'UBICACION', 'ESTADO', 'OBSERVACION'];
  const ejemplo = ['Plaza República', 'Operaciones TI', '15', '8', 'Activo', ''];
  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sitios');
  XLSX.writeFile(wb, 'Plantilla_Sitios_Moviles.xlsx');
  showToast('Plantilla descargada');
}

let _cargaMasivaSitiosData = [];

function _procesarExcelSitios(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) { showToast('Archivo vacío', 'error'); return; }

      const sitiosExistentes = DB.get('sitiosMoviles');

      // Track keys within the file for intra-file duplicate detection
      const seenInFile = {};

      _cargaMasivaSitiosData = rows.map((r, i) => {
        const sede = String(r.SEDE || r.sede || '').trim().toUpperCase();
        const area = String(r.AREA || r.area || '').trim().toUpperCase();
        const piso = String(r.PISO || r.piso || '').trim().toUpperCase();
        const ubi  = String(r.UBICACION || r.ubicacion || '').trim().toUpperCase();
        const obs  = String(r.OBSERVACION || r.observacion || '').trim();
        const errors = [];

        if (!sede) errors.push('SEDE requerida');
        if (!piso) errors.push('PISO requerido');
        if (!ubi) errors.push('UBICACIÓN requerida');

        // Check duplicate against existing sitios
        const key = `${sede}|${area}|${piso}|${ubi}`;
        const dupExist = sitiosExistentes.find(s => s.sede === sede && s.area === area && s.piso === piso && s.ubicacion === ubi);
        if (dupExist) errors.push('DUPLICADO — ya existe en sitios móviles');

        // Check duplicate within the file
        if (!errors.length && seenInFile[key] !== undefined) {
          errors.push('DUPLICADO en archivo (fila ' + (seenInFile[key] + 2) + ')');
        }
        if (!errors.length) seenInFile[key] = i;

        return { sede, area, piso, ubicacion: ubi, observacion: obs, _row: i + 2, _errors: errors, _valid: errors.length === 0 };
      });

      _cmSitiosStep = 3;
      _renderCmSitiosStep();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };
  reader.readAsArrayBuffer(file);
}

function _renderCargaMasivaSitiosPreview() {
  const container = document.getElementById('sitiosPreviewWrap') || document.getElementById('sitiosCmpContainer');
  if (!container) return;
  const total = _cargaMasivaSitiosData.length;
  const validos = _cargaMasivaSitiosData.filter(r => r._valid).length;
  const invalidos = total - validos;

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <span style="font-size:13px;font-weight:600">Total: ${total}</span>
      <span style="font-size:13px;color:#059669;font-weight:600">✓ Válidos: ${validos}</span>
      ${invalidos > 0 ? `<span style="font-size:13px;color:#dc2626;font-weight:600">✗ Con errores: ${invalidos}</span>` : ''}
    </div>
    <div style="max-height:400px;overflow:auto;border:1px solid var(--border);border-radius:8px">
      <table class="cmdb-table" style="font-size:12px;margin:0">
        <thead><tr>
          <th style="width:30px">#</th>
          <th>SEDE</th><th>ÁREA</th><th>PISO</th><th>UBICACIÓN</th><th>OBSERVACIÓN</th><th>ESTADO</th>
        </tr></thead>
        <tbody>
          ${_cargaMasivaSitiosData.map(r => `
            <tr style="${!r._valid ? 'background:#fef2f2' : ''}">
              <td>${r._row}</td>
              <td>${esc(r.sede)}</td>
              <td>${esc(r.area)}</td>
              <td>${esc(r.piso)}</td>
              <td>${esc(r.ubicacion)}</td>
              <td>${esc(r.observacion)}</td>
              <td>${r._valid
                ? '<span style="color:#059669;font-weight:600">✓</span>'
                : `<span style="color:#dc2626;font-size:11px">${r._errors.join(', ')}</span>`}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
      <button class="btn btn-secondary" onclick="_cmSitiosStep=2;_cargaMasivaSitiosData=[];_renderCmSitiosStep()">&larr; Subir otro archivo</button>
      ${validos > 0 ? `<button class="btn btn-primary" onclick="_cmSitiosStep=4;_renderCmSitiosStep()">Continuar con ${validos} v&aacute;lidos &rarr;</button>` : '<span style="color:#dc2626;font-weight:600">No hay registros v&aacute;lidos</span>'}
    </div>
  `;
}

async function _ejecutarCargaMasivaSitios() {
  const validos = _cargaMasivaSitiosData.filter(r => r._valid);
  if (validos.length === 0) return;
  if (!confirm('¿Importar ' + validos.length + ' sitios móviles?')) return;

  const sitios = DB.get('sitiosMoviles');
  validos.forEach(r => {
    const _s = { id: nextId(sitios), sede: r.sede, area: r.area, piso: r.piso, ubicacion: r.ubicacion, estado: 'Activo', observacion: r.observacion };
    _s.nombreVisible = _buildSitioNombre(_s);
    sitios.push(_s);
  });
  DB.set('sitiosMoviles', sitios);
  await DB.flush();
  closeModal();
  showToast(validos.length + ' sitios importados correctamente');
  renderSitiosMoviles(document.getElementById('contentArea'));
  _cargaMasivaSitiosData = [];
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

function _onCesSearch(val) {
  cesSearch = val;
  resetPage('ceses');
  debounceSearch('ces', _renderCesTable);
}

function _renderCesTable() {
  const wrap = document.getElementById('cesTableWrap');
  if (!wrap) return;
  const cesados = DB.get('colaboradores').filter(c => c.estado === 'Cesado');
  const asignaciones = DB.get('asignaciones');

  const filtered = cesados.filter(c => {
    if (cesSearch) {
      const s = cesSearch.toLowerCase();
      return _fullName(c).toLowerCase().includes(s) ||
             (c.dni || '').toLowerCase().includes(s) ||
             (c.area || '').toLowerCase().includes(s) ||
             (c.puesto || c.tipoPuesto || '').toLowerCase().includes(s) ||
             (c.email || '').toLowerCase().includes(s) ||
             (c.ubicacionFisica || c.ubicacion || '').toLowerCase().includes(s);
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
                            ${esc(_fullName(c).split(' ').map(p => p[0]).slice(0, 2).join(''))}
                          </div>
                          <strong>${esc(_fullName(c))}</strong>
                        </div>
                      </td>
                      <td style="font-family:monospace;font-size:12px">${esc(c.dni)}</td>
                      <td style="font-size:12px">${esc(c.area || '—')}</td>
                      <td style="font-size:12px">${esc(c.ubicacionFisica || c.ubicacion || '—')}</td>
                      <td style="font-size:12px">${esc(c.puesto || c.tipoPuesto || '—')}</td>
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

  openModal('Devolución de Activos — ' + esc(_fullName(c)), `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700">
          ${esc(_fullName(c).split(' ').map(p => p[0]).slice(0, 2).join(''))}
        </div>
        <div>
          <strong style="font-size:15px">${esc(_fullName(c))}</strong>
          <div style="font-size:12px;color:var(--text-muted)">${esc(c.puesto || c.tipoPuesto || '')} — ${esc(c.area || '')} | Cese: ${formatDate(c.fechaCese)}</div>
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
          <strong>${esc(_fullName(c))}</strong>
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
    'DISPONIBLE':      ['NUEVO', 'USADO'],
    'MANTENIMIENTO':   ['REPARACIÓN', 'GARANTÍA'],
    'BAJA':            ['DESTRUCCIÓN', 'DONACIÓN', 'VENTA'],
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

  const _nrItems = []; // Para registrar NO RECUPERABLE después

  items.forEach((item, i) => {
    const destino = document.getElementById('devDest_' + i).value;
    const subSel = document.getElementById('devSub_' + i);
    const subDestino = subSel && subSel.value ? subSel.value : '';
    item.destino = destino; // guardar para bitácora

    // Marcar asignación como devuelta
    const a = asig.find(x => x.id === item.asigId);
    if (a) a.estado = 'Devuelto';

    // Actualizar activo según destino
    const activo = activos.find(x => x.id === item.activoId);
    if (!activo) return;

    // Marcar serie específica si aplica
    if (item.serie && activo.series && activo.series.length > 0) {
      const serieObj = activo.series.find(s => (s.serie || '').toUpperCase().trim() === (item.serie || '').toUpperCase().trim());
      if (serieObj && destino === 'NO RECUPERABLE') {
        serieObj.estadoSerie = 'Baja';
      }
    }

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
          activo.estado = 'Mantenimiento';
          activo.estadoEquipo = subDestino || 'REPARACIÓN';
          activo.responsable = '';
        }
        resumen.push(`${item.codigo} → MANTENIMIENTO (${subDestino || 'REPARACIÓN'})`);
        break;
      case 'BAJA':
        if (otrasVigentes === 0) {
          activo.estado = 'Baja';
          activo.motivoBaja = subDestino || '';
          activo.responsable = '';
        }
        resumen.push(`${item.codigo} → BAJA (${subDestino})`);
        break;
      case 'NO RECUPERABLE':
        if (otrasVigentes === 0) {
          activo.estado = 'Baja';
          activo.motivoBaja = 'CESE-NO RECUPERABLE';
          activo.responsable = '';
        }
        _nrItems.push({ item, activo });
        resumen.push(`${item.codigo} → NO RECUPERABLE`);
        break;
    }
  });

  DB.set('asignaciones', asig);
  DB.set('activos', activos);

  const c = DB.get('colaboradores').find(x => x.id === colabId);

  // Registrar NO RECUPERABLE directo en historial de bajas
  if (_nrItems.length > 0) {
    const histBajas = DB.get('historialBajas');
    _nrItems.forEach(({ item, activo }) => {
      histBajas.unshift({
        id: nextId(histBajas),
        activoId: item.activoId,
        activoCodigo: item.codigo,
        activoTipo: activo.equipo || activo.tipo || '',
        marca: activo.marca || '',
        modelo: activo.modelo || '',
        serie: item.serie || '',
        codInv: activo.codInv || '',
        almacen: activo.ubicacion || '',
        estadoEquipo: 'NO RECUPERABLE',
        motivoBaja: 'CESE-NO RECUPERABLE',
        costo: activo.costo || 0,
        fechaCompra: activo.fechaCompra || '',
        antiguedad: '',
        responsable: c ? _fullName(c) : '',
        observaciones: 'Equipo no recuperable por cese de colaborador',
        fechaSalida: today(),
        numGuia: '',
        guiaArchivo: '',
        etapaBaja: '',
        estadoBaja: 'Ejecutada',
        fechaAprobacion: today(),
        solicitante: currentUser ? currentUser.nombre : 'Sistema'
      });
    });
    DB.set('historialBajas', histBajas);
  }
  addMovimiento('Devolución Cese', `${items.length} activo(s) procesados de ${c ? _fullName(c) : 'colaborador'}: ${resumen.join('; ')}`);

  // Auto-registrar en bitácora por cada equipo devuelto
  items.forEach(item => {
    const _devActivo = activos.find(x => x.id === item.activoId);
    if (_devActivo) {
      const _isNR = item.destino === 'NO RECUPERABLE';
      _autoBitacora({
        movimiento: _isNR ? 'BAJA' : 'INGRESO',
        almacen: (_devActivo.ubicacion || 'Almacen TI'),
        tipoEquipo: _devActivo.tipo || '',
        equipo: _devActivo.equipo || _devActivo.tipo || '',
        modelo: _devActivo.modelo || '',
        serie: item.serie || '',
        codInv: _devActivo.codInv || '',
        correo: c ? (c.email || '') : '',
        motivo: _isNR ? 'CESE-NO RECUPERABLE' : 'CESE'
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
  const puestos = DB.getConfig('tipoPuesto', []);
  const modalidades = ['Empleado', 'Practicante', 'Externo', 'Intermediario'];

  openModal(c ? 'Editar Colaborador' : 'Nuevo Colaborador', `
    <div class="form-grid">
      <div class="form-group">
        <label>Nombre <span class="required">*</span></label>
        <input class="form-control" id="fCNombre" value="${esc(_fullName(c))}">
      </div>
      <div class="form-group">
        <label>Apellido <span class="required">*</span></label>
        <input class="form-control" id="fCApellido" value="${esc(c?.apellido || '')}">
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
        <label>Modalidad Contratación <span class="required">*</span></label>
        <select class="form-control" id="fCModalidad">
          <option value="">Seleccionar...</option>
          ${modalidades.map(m => `<option value="${m}" ${(c?.modalidadContratacion || c?.perfil) === m ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Área</label>
        <select class="form-control" id="fCArea"><option value="">Seleccionar...</option>${optionsHTML(areas, c?.area)}</select>
      </div>
      <div class="form-group">
        <label>Vicepresidencia</label>
        <input class="form-control" id="fCVicepresidencia" value="${esc(c?.vicepresidencia || '')}">
      </div>
      <div class="form-group">
        <label>Centro de Costo</label>
        <input class="form-control" id="fCCentroCosto" value="${esc(c?.centroCosto || '')}">
      </div>
      <div class="form-group">
        <label>Ubicación Física</label>
        <select class="form-control" id="fCUbicacion"><option value="">Seleccionar...</option>${optionsHTML(sedes, c?.ubicacionFisica || c?.ubicacion)}</select>
      </div>
      <div class="form-group">
        <label>Puesto</label>
        <input class="form-control" id="fCPuesto" placeholder="Ej: Analista, Coordinador..." value="${esc(c?.puesto || c?.tipoPuesto || '')}">
      </div>
      <div class="form-group">
        <label>Correo Supervisor</label>
        <input class="form-control" id="fCCorreoSupervisor" placeholder="supervisor@empresa.com" value="${esc(c?.correoSupervisor || '')}">
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
  const apellido = (document.getElementById('fCApellido') || {}).value || '';
  const dni = document.getElementById('fCDni').value.trim();
  const email = document.getElementById('fCEmail').value.trim();
  const telefono = document.getElementById('fCTelefono').value.trim();
  const modalidadContratacion = (document.getElementById('fCModalidad') || {}).value || '';
  const area = document.getElementById('fCArea').value;
  const vicepresidencia = (document.getElementById('fCVicepresidencia') || {}).value || '';
  const centroCosto = (document.getElementById('fCCentroCosto') || {}).value || '';
  const ubicacionFisica = (document.getElementById('fCUbicacion') || {}).value || '';
  const puesto = (document.getElementById('fCPuesto') || {}).value || '';
  const correoSupervisor = (document.getElementById('fCCorreoSupervisor') || {}).value || '';
  const fecha = document.getElementById('fCFecha').value;

  if (!nombre || !apellido || !dni) {
    showToast('Complete nombre, apellido y DNI', 'error');
    return;
  }
  if (!modalidadContratacion) {
    showToast('Seleccione modalidad de contratación', 'error');
    return;
  }

  const colabs = DB.get('colaboradores');
  const _data = { nombre, apellido, dni, email, telefono, modalidadContratacion, perfil: modalidadContratacion, area, vicepresidencia, centroCosto, ubicacionFisica, ubicacion: ubicacionFisica, puesto, tipoPuesto: puesto, correoSupervisor, fechaIngreso: fecha };

  if (id) {
    const idx = colabs.findIndex(c => c.id === id);
    if (idx >= 0) {
      colabs[idx] = { ...colabs[idx], ...upperFields(_data) };
      // Sincronizar snapshots en asignaciones vigentes
      const asig = DB.get('asignaciones');
      let asigChanged = false;
      const updated = colabs[idx];
      asig.forEach(a => {
        if (a.colaboradorId === id && a.estado === 'Vigente') {
          a.colaboradorNombre = _fullName(updated);
          a.correoColab = updated.email || '';
          a.area = updated.area || '';
          asigChanged = true;
        }
      });
      if (asigChanged) DB.set('asignaciones', asig);
    }
  } else {
    colabs.push(upperFields({
      id: nextId(colabs), ..._data,
      estado: 'Activo', fechaIngreso: fecha || today()
    }));
    addMovimiento('Ingreso Colaborador', `Nuevo colaborador: ${nombre.toUpperCase()} ${apellido.toUpperCase()}`);
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
          ${esc(_fullName(c).split(' ').map(p => p[0]).slice(0, 2).join(''))}
        </div>
        <div>
          <strong style="font-size:15px">${esc(_fullName(c))}</strong>
          <div style="font-size:12px;color:var(--text-muted)">${esc(c.puesto || c.tipoPuesto || '')} — ${esc(c.area || '')}</div>
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
  addMovimiento('Cese', `Colaborador ${_fullName(c)} — ${esFuturo ? 'próximo cese' : 'cesado'} el ${formatDate(fechaCese)}.`);
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
// Filtros dinámicos del inventario CMDB
const _INV_FILTER_OPTIONS = [
  { key: 'estadoCMDB',    label: 'Estado CMDB' },
  { key: 'sede',           label: 'Almacén' },
  { key: 'tipo',           label: 'Tipo Equipo' },
  { key: 'marca',          label: 'Marca' },
  { key: 'estadoEquipo',   label: 'Estado Equipo' },
  { key: 'areaTrabajo',    label: 'Área Trabajo' },
  { key: 'usoEquipo',      label: 'Uso Equipo' },
];
let _invActiveFilters = { estadoCMDB: 'Todos' }; // estadoCMDB activo por defecto
let _invFilterMenuOpen = false;

// Caché de inventario para evitar recálculos costosos
let _invRowsCache = null;
let _invRowsCacheVersion = 0;

function _invalidateInvCache() { _invRowsCache = null; }

function _buildInventarioRows() {
  // Retornar caché si es válido
  if (_invRowsCache) return _invRowsCache;

  const activos = DB.get('activos');
  const asignaciones = DB.get('asignaciones');
  const colaboradores = DB.get('colaboradores');

  // Índices para O(1) lookups en lugar de .find() repetidos
  const _asigByKey = new Map();     // 'activoId||SERIE' → asignación vigente
  const _asigByActivo = new Map();  // activoId → asignación vigente (sin serie)
  asignaciones.forEach(a => {
    if (a.estado !== 'Vigente') return;
    const serie = (a.serieAsignada || '').toUpperCase().trim();
    if (serie) {
      _asigByKey.set(a.activoId + '||' + serie, a);
    } else {
      _asigByActivo.set(a.activoId, a);
    }
  });

  const _colabById = new Map();
  colaboradores.forEach(c => _colabById.set(c.id, c));

  const rows = [];

  // Helper para construir una fila (evita duplicar código)
  function _pushRow(a, s, asig) {
    const colab = asig && asig.colaboradorId ? _colabById.get(asig.colaboradorId) : null;
    const _esSitio = asig && (asig.tipoDestino || '').toUpperCase() === 'SITIO';
    rows.push({
      activoId: a.id,
      sede: a.ubicacion || '',
      tipo: a.tipo || '',
      equipo: a.equipo || a.tipo || '',
      marca: a.marca || '',
      modelo: a.modelo || '',
      serie: s ? (s.serie || '') : '',
      codInv: s ? (s.codInv || '') : '',
      fechaAsignacion: asig ? asig.fechaAsignacion || '' : '',
      motivo: asig ? asig.motivo || '' : '',
      actaEntrega: asig ? (asig.actaEntrega || 'PENDIENTE') : '',
      estadoCMDB: asig ? 'Asignado' : (s ? (s.estadoSerie || a.estado || 'Disponible') : (a.estado || 'Disponible')),
      estadoEquipo: s ? (s.estadoEquipoSerie || a.estadoEquipo || '') : (a.estadoEquipo || ''),
      usoEquipo: asig ? (asig.usoEquipo || getMapeoFuncional(a.tipo || a.equipo)) : '',
      areaTrabajo: _esSitio ? 'SITIOS MOVILES' : (colab ? colab.area || '' : ''),
      correo: _esSitio ? '—' : (colab ? colab.email || '' : ''),
      colaborador: _esSitio ? (asig.sitioNombre || asig.colaboradorNombre || '') : (colab ? _fullName(colab) + (colab.puesto || colab.tipoPuesto ? ' / ' + (colab.puesto || colab.tipoPuesto) : '') : ''),
      jefe: asig ? asig.jefe || '' : '',
      ticket: asig ? asig.ticket || '' : ''
    });
  }

  activos.forEach(a => {
    if ((a.estado || '').toUpperCase() === 'BAJA') return;

    const series = a.series || [];
    if (series.length === 0) {
      _pushRow(a, null, _asigByActivo.get(a.id) || null);
    } else {
      series.forEach(s => {
        if ((s.estadoSerie || '').toUpperCase() === 'BAJA') return;
        const key = a.id + '||' + (s.serie || '').toUpperCase().trim();
        _pushRow(a, s, _asigByKey.get(key) || null);
      });
    }
  });

  _invRowsCache = rows;
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
      ${_f('Cod. Inv', serieObj.codInv, {mono:true})}
      ${_f('Tipo de Equipo', activo.tipo)}
      ${_f('Equipo', activo.equipo || activo.tipo)}
      ${(() => {
        const _eqEst = serieObj.estadoEquipoSerie || activo.estadoEquipo || '';
        const _eqPartes = serieObj.partesAfectadas || activo.partesAfectadas || '';
        const _eqObs = serieObj.obsRetorno || activo.obsRetorno || '';
        const _eqFull = _eqEst + (_eqPartes ? ' — ' + _eqPartes : '') + (_eqObs ? ' — ' + _eqObs : '');
        const _eqColor = _eqEst === 'NUEVO' ? '#16a34a' : _eqEst === 'BUENO' || _eqEst === 'USADO' ? '#2563eb' : '#d97706';
        return _f('Estado Equipo', _eqFull, {color: _eqColor});
      })()}
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
        ${esc((colab ? _fullName(colab) : asig.colaboradorNombre || '').split(' ').map(p => p[0]).slice(0,2).join(''))}
      </div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:800;color:#1e3a5f">${esc(colab ? _fullName(colab) : asig.colaboradorNombre)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">${esc(colab ? (colab.puesto || colab.tipoPuesto || '') : '')} ${colab && colab.area ? '— ' + esc(colab.area) : ''}</div>
      </div>
      <span style="padding:4px 10px;border-radius:16px;font-size:10px;font-weight:700;${colab && colab.estado === 'Activo' ? 'background:#dcfce7;color:#166534' : 'background:#fef2f2;color:#991b1b'}">${esc(colab ? colab.estado : '')}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${_f('DNI', colab ? colab.dni : '', {mono:true})}
      ${_f('Correo', colab ? colab.email : asig.correoColab)}
      ${_f('Área', colab ? colab.area : asig.area)}
      ${_f('Puesto', colab ? (colab.puesto || colab.tipoPuesto) : '')}
      ${_f('Ubicación Física', colab ? (colab.ubicacionFisica || colab.ubicacion) : '')}
      ${_f('Mod. Contratación', colab ? (colab.modalidadContratacion || colab.perfil) : '')}
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
  const _almEstado = (serieObj.estadoSerie || activo.estado || 'Disponible');
  const _almEsMant = _almEstado.toUpperCase().includes('MANTENIMIENTO');
  const _almEsBaja = _almEstado.toUpperCase() === 'BAJA';
  const tabAlmacen = !esAsignado ? `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:linear-gradient(135deg,${_almEsMant ? '#fefce8,#fef9c3' : _almEsBaja ? '#fef2f2,#fee2e2' : '#f0fdf4,#dcfce7'});border-radius:12px;margin-bottom:14px">
      <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,${_almEsMant ? '#f59e0b,#d97706' : _almEsBaja ? '#ef4444,#dc2626' : '#10b981,#059669'});display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;flex-shrink:0">${_almEsMant ? '🔧' : _almEsBaja ? '⛔' : '🏢'}</div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:800;color:${_almEsMant ? '#92400e' : _almEsBaja ? '#991b1b' : '#14532d'}">${esc(activo.ubicacion || 'Sin ubicación')}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">${_almEsMant ? 'Equipo en mantenimiento' : _almEsBaja ? 'Equipo dado de baja' : 'Equipo disponible en almacén'}</div>
      </div>
      <span style="padding:4px 10px;border-radius:16px;font-size:10px;font-weight:700;${_almEsMant ? 'background:#fef3c7;color:#92400e' : _almEsBaja ? 'background:#fef2f2;color:#991b1b' : 'background:#dcfce7;color:#166534'}">${_almEsMant ? 'MANTENIMIENTO' : _almEsBaja ? 'BAJA' : 'EN STOCK'}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${_f('Sede / Ubicación', activo.ubicacion, {bg:'#f0fdf4', border:'#bbf7d0'})}
      ${_f('Ubicación Almacén', activo.ubicacionAlmacen, {bg:'#f0fdf4', border:'#bbf7d0'})}
      ${_f('Fecha Ingreso', formatDate(activo.fechaIngreso))}
      ${_f('Fecha Compra', formatDate(activo.fechaCompra))}
      ${(() => {
        const _aeEst = serieObj.estadoEquipoSerie || activo.estadoEquipo || '';
        const _aePartes = serieObj.partesAfectadas || activo.partesAfectadas || '';
        const _aeObs = serieObj.obsRetorno || activo.obsRetorno || '';
        const _aeFull = _aeEst + (_aePartes ? ' — ' + _aePartes : '') + (_aeObs ? ' — ' + _aeObs : '');
        return _f('Estado Equipo', _aeFull);
      })()}
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
          ${(() => {
            const _estadoSerie = serieObj.estadoSerie || activo.estado || 'Disponible';
            const _esMantenimiento = (_estadoSerie || '').toUpperCase().includes('MANTENIMIENTO');
            const _esBaja = (_estadoSerie || '').toUpperCase() === 'BAJA';
            const _badgeStyle = esAsignado ? 'background:#dbeafe;color:#1e40af;border:1px solid #93c5fd'
              : _esMantenimiento ? 'background:#fef3c7;color:#92400e;border:1px solid #fde68a'
              : _esBaja ? 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca'
              : 'background:#dcfce7;color:#166534;border:1px solid #86efac';
            const _badgeLabel = esAsignado ? 'ASIGNADO' : _esMantenimiento ? 'MANTENIMIENTO' : _esBaja ? 'BAJA' : 'DISPONIBLE';
            return '<span style="padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.3px;' + _badgeStyle + '">' + _badgeLabel + '</span>';
          })()}
          ${(() => {
            const _eqSerie = serieObj.estadoEquipoSerie || activo.estadoEquipo || '';
            return _eqSerie ? '<span style="padding:3px 10px;border-radius:16px;font-size:10px;font-weight:600;background:#f1f5f9;color:#475569">' + esc(_eqSerie) + '</span>' : '';
          })()}
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
    ${esAsignado && asig ? `<button class="btn btn-warning" onclick="closeModal();_devolverDesdeDetalle(${asig.id})" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-weight:700">🔄 Devolver</button>` : ''}
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  `, 'modal-lg');
}

function _devolverDesdeDetalle(asigId) {
  confirmarRetorno(asigId, 'DEVOLUCIÓN');
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
  debounceSearch('inv', _renderInvTable);
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
           r.codInv.toLowerCase().includes(s) ||
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
              <th style="${thStyle}">Almacén</th>
              <th style="${thStyle}">Tipo Equipo</th>
              <th style="${thStyle}">Equipo</th>
              <th style="${thStyle}">Marca</th>
              <th style="${thStyle}">Modelo</th>
              <th style="${thStyle}">Serie</th>
              <th style="${thStyle}">Cod. Inv</th>
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
                    r.estadoCMDB === 'Mantenimiento' ? 'badge-warning' : 'badge-danger';
                  return `
                    <tr>
                      <td style="${tdStyle}">${esc(r.sede || '—')}</td>
                      <td style="${tdStyle}">${esc(r.tipo || '—')}</td>
                      <td style="${tdStyle}">${esc(r.equipo || '—')}</td>
                      <td style="${tdStyle}">${esc(r.marca || '—')}</td>
                      <td style="${tdStyle}">${esc(r.modelo || '—')}</td>
                      <td style="${tdStyle};font-family:monospace">${r.serie ? `<a href="#" onclick="verDetalleSerie(${r.activoId},'${esc(r.serie)}');return false" style="color:var(--primary);text-decoration:underline;cursor:pointer;font-weight:600">${esc(r.serie)}</a>` : '—'}</td>
                      <td style="${tdStyle};font-family:monospace">${esc(r.codInv || '—')}</td>
                      <td style="${tdStyle}">${formatDate(r.fechaAsignacion)}</td>
                      <td style="${tdStyle}">${esc(r.motivo || '—')}</td>
                      <td style="${tdStyle}${r.actaEntrega === 'PENDIENTE' ? ';color:#dc2626;font-weight:600' : ''}">${esc(r.actaEntrega || '—')}</td>
                      <td style="${tdStyle}"><span class="badge ${estadoBadge}" style="font-size:9px">${esc(r.estadoCMDB || '—')}</span></td>
                      <td style="${tdStyle}">${esc(r.estadoEquipo || '—')}</td>
                      <td style="${tdStyle}"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;${r.usoEquipo === 'EP-ADMIN' ? 'background:#dbeafe;color:#1d4ed8' : r.usoEquipo === 'ADIC-ERG' ? 'background:#fef3c7;color:#92400e' : 'background:#f1f5f9;color:#64748b'}">${esc(r.usoEquipo || '—')}</span></td>
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
  const headers = ['ALMACEN','TIPO_EQUIPO','EQUIPO','MARCA','MODELO','SERIE','COD_INV','FECHA_ASIGNACION','MOTIVO','ACTA_ENTREGA','ESTADO_CMDB','ESTADO_EQUIPO','USO_EQUIPO','AREA_TRABAJO','CORREO','COLABORADOR_POSICION','JEFE_RESPONSABLE','TICKET'];
  const data = rows.map(r => [r.sede,r.tipo,r.equipo,r.marca,r.modelo,r.serie,r.codInv,formatDate(r.fechaAsignacion),r.motivo,r.actaEntrega,r.estadoCMDB,r.estadoEquipo,r.usoEquipo,r.areaTrabajo,r.correo,r.colaborador,r.jefe,r.ticket]);
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
// Almacén de archivos adjuntos (base64) - persistido en localStorage
// ── IndexedDB para archivos de bitácora (sin límite de localStorage) ──
const _bitArchivos = {
  _dbName: 'ati_archivos_db',
  _storeName: 'bitacoraArchivos',
  _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this._storeName)) {
          db.createObjectStore(this._storeName, { keyPath: 'movId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async save(movId, fileData) {
    try {
      const db = await this._open();
      const tx = db.transaction(this._storeName, 'readwrite');
      tx.objectStore(this._storeName).put({ movId, ...fileData });
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
      db.close();
    } catch(e) { showToast('Error al guardar archivo', 'error'); console.error(e); }
  },
  async find(movId) {
    try {
      const db = await this._open();
      const tx = db.transaction(this._storeName, 'readonly');
      const req = tx.objectStore(this._storeName).get(movId);
      const result = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej; });
      db.close();
      return result || null;
    } catch(e) { console.error(e); return null; }
  },
  // Migrar datos viejos de localStorage a IndexedDB (una sola vez)
  async migrate() {
    try {
      const old = DB.get('bitacoraArchivos');
      if (old && old.length > 0) {
        const db = await this._open();
        const tx = db.transaction(this._storeName, 'readwrite');
        const store = tx.objectStore(this._storeName);
        old.forEach(item => store.put(item));
        await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
        db.close();
        DB.remove('bitacoraArchivos');
      }
    } catch(e) { console.error('Error migrando archivos:', e); }
  }
};

function _initBitacoraData() {
  if (!DB.get('bitacoraMovimientos') || DB.get('bitacoraMovimientos').length === 0) {
    DB.set('bitacoraMovimientos', []);
  }
  // Migrar archivos viejos de localStorage a IndexedDB
  _bitArchivos.migrate();
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
    codInv: (opts.codInv || '').toUpperCase(),
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
  debounceSearch('bit', _renderBitTable);
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
             (m.codInv || '').toLowerCase().includes(s) ||
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
              <th style="min-width:100px">COD. INV</th>
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

                  const _isBajaNR = (m.movimiento || '').toUpperCase() === 'BAJA' && (m.motivo || '').toUpperCase() === 'CESE-NO RECUPERABLE';
                  const actaHTML = (isCancelado || _isBajaNR)
                    ? `<button class="btn bit-btn-cargar" disabled style="opacity:0.5;cursor:not-allowed" title="${_isBajaNR ? 'No aplica acta para baja no recuperable' : ''}">📎 Cargar acta</button>`
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
                    <td style="font-size:12px">${esc(m.codInv || '-')}</td>
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
        <label>COD. INV (Cod. Patrimonial)</label>
        <input id="bitInv" class="form-control" placeholder="Cod. Inv (Patrimonial)" value="${m ? esc(m.codInv) : ''}">
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
  const codInv = document.getElementById('bitInv').value.trim();
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
    codInv,
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
  reader.onerror = function() { showToast('Error al leer el archivo', 'error'); };
  reader.readAsDataURL(file);
}

async function _confirmActaUpload(movId) {
  if (!_bitPendingFile) { showToast('No hay archivo seleccionado', 'error'); return; }

  const movs = DB.get('bitacoraMovimientos');
  const idx = movs.findIndex(m => m.id === movId);
  if (idx < 0) return;

  const correlativo = _nextActaCorrelativo();

  // Guardar archivo en IndexedDB
  await _bitArchivos.save(movId, {
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

  for (const m of movs) {
    const mTicket = (m.ticket || '').toUpperCase().trim();
    const mCorreo = (m.correo || '').toUpperCase().trim();
    const mFecha = (m.fechaRegistro || '').split('T')[0];
    if (_refTicket && mTicket === _refTicket && mCorreo === _refCorreo && mFecha === _refFecha) {
      m.actaCorrelativo = correlativo;
      m.estadoAsignacion = 'ATENDIDO';
      _relatedIds.push(m.id);
      // Guardar el mismo archivo para cada movimiento relacionado
      if (m.id !== movId) {
        await _bitArchivos.save(m.id, {
          correlativo,
          name: _bitPendingFile.name,
          type: _bitPendingFile.type,
          data: _bitPendingFile.data
        });
      }
    }
  }

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

async function verActaAdjunta(movId) {
  const archivo = await _bitArchivos.find(movId);
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

  const headers = ['ID', 'MOVIMIENTO', 'FECHA', 'ALMACEN', 'EQUIPO', 'MODELO', 'SERIE', 'COD_INV', 'ESTADO_ASIGNACION', 'ACTA_ASIGNACION', 'TICKET', 'CORREO', 'GESTOR'];
  const data = movs.map(m => [m.id, m.movimiento, formatDate(m.fechaRegistro), _limpiarAlmacen(m.almacen), m.equipo, m.modelo, m.serie, m.codInv, m.estadoAsignacion, m.actaCorrelativo || '', m.ticket || '', m.correo, m.gestor]);
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
          <button type="button" class="btn btn-sm" onclick="_retornoSelectCmdb('Mantenimiento')" id="retCmdb_Mantenimiento"
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
  'Disponible':    ['NUEVO', 'USADO'],
  'Mantenimiento': ['REPARACIÓN', 'GARANTÍA'],
  'Baja':          ['DESTRUCCIÓN', 'DONACIÓN', 'VENTA']
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
  const colors = { 'Disponible': '#10b981', 'Mantenimiento': '#f59e0b', 'Baja': '#ef4444' };
  const bg = { 'Disponible': '#f0fdf4', 'Mantenimiento': '#fffbeb', 'Baja': '#fef2f2' };
  const key = val === 'Mantenimiento' ? 'Mantenimiento' : val;
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
  rec.motivoCese = _retornoMotivo === 'REPOSICIÓN ROBO' ? 'REPOSICIÓN ROBO' : _retornoMotivo === 'REPOSICIÓN DAÑO FÍSICO' ? 'REPOSICIÓN DAÑO FÍSICO' : _retornoMotivo === 'REEMPLAZO' ? 'REEMPLAZO' : _retornoMotivo === 'RENOVACIÓN' ? 'RENOVACIÓN' : _retornoMotivo === 'DEVOLUCIÓN' ? 'DEVOLUCIÓN' : 'RETORNO POR CESE';
  rec.retornoObs = obs.trim();
  rec.retornoEstadoCmdb = _retornoCmdb;
  rec.retornoEstadoEquipo = _retornoEstadoEq;
  if (partes.length) rec.retornoPartes = partes;
  if (_esRoboRet && _retornoDenunciaFile) {
    rec.denunciaRobo = _retornoDenunciaFile.name;
    rec.denunciaRoboFecha = today();
  }

  // Actualizar activo y serie específica
  const activo = activos.find(a => a.id === rec.activoId);
  if (activo) {
    // Marcar la serie específica retornada
    const _serieRet = (rec.serieAsignada || '').toUpperCase().trim();
    if (_serieRet && activo.series && activo.series.length > 0) {
      const serieObj = activo.series.find(s => (s.serie || '').toUpperCase().trim() === _serieRet);
      if (serieObj) {
        serieObj.estadoSerie = _retornoCmdb;
        serieObj.estadoEquipoSerie = _retornoEstadoEq;
        if (partes.length) serieObj.partesAfectadas = partes.join(', ');
        serieObj.obsRetorno = obs.trim();
        if (_esRoboRet) serieObj.motivoBaja = 'ROBO';
        else if (_retornoCmdb === 'Baja') serieObj.motivoBaja = _retornoEstadoEq;
      }
    }

    // Cambiar estado global del activo (1 activo = 1 serie)
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
    const _esBajaRet = _retornoCmdb === 'Baja';
    const _motivoOrig = (rec.tipoAsignacion || rec.motivo || '').toUpperCase();
    let _motivoBit = '';
    if (_esRoboRet) _motivoBit = 'REPOSICIÓN ROBO';
    else if (['REEMPLAZO','RENOVACIÓN','RENOVACION','PRÉSTAMO','PRESTAMO','REPOSICIÓN DAÑO FÍSICO','REPOSICIÓN ROBO'].includes(_motivoOrig)) _motivoBit = rec.tipoAsignacion || rec.motivo;
    else if (_esBajaRet) _motivoBit = 'BAJA — ' + (_retornoEstadoEq || 'DESTRUCCIÓN');
    else if ((_retornoMotivo || '').toUpperCase() === 'DEVOLUCIÓN' || (_retornoMotivo || '').toUpperCase() === 'DEVOLUCION') _motivoBit = 'DEVOLUCIÓN';
    else _motivoBit = (rec.motivoCese || '').toUpperCase().includes('CESE') ? 'CESE' : 'RETORNO';

    _autoBitacora({
      movimiento: (_esRoboRet || _esBajaRet) ? 'BAJA' : 'INGRESO',
      almacen: _esRoboRet ? 'N/A — ROBO' : (almacen || 'Almacen TI'),
      tipoEquipo: activo.tipo || rec.activoTipo || '',
      equipo: activo.equipo || activo.tipo || '',
      modelo: activo.modelo || rec.activoModelo || '',
      serie: rec.serieAsignada || '',
      codInv: activo.codInv || '',
      correo: rec.correoColab || '',
      motivo: _motivoBit
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
function _buildBajasRows() {
  const activos = DB.get('activos');
  const asignaciones = DB.get('asignaciones');
  const historial = DB.get('historialBajas') || [];
  const rows = [];

  // Índice: última asignación por activoId (O(n) una vez, no O(n²))
  const _ultimaAsigByActivo = new Map();
  asignaciones.forEach(a => {
    const prev = _ultimaAsigByActivo.get(a.activoId);
    if (!prev || (a.fechaAsignacion || '') > (prev.fechaAsignacion || '')) {
      _ultimaAsigByActivo.set(a.activoId, a);
    }
  });

  activos.forEach(a => {
    const ultimaAsig = _ultimaAsigByActivo.get(a.id) || null;

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

    const eUp = (a.estado || '').toUpperCase();
    const _seriesList = (a.series && a.series.length > 0) ? a.series : [{}];

    _seriesList.forEach(s => {
      // Determinar si esta serie específica está en baja
      const serieEstado = (s.estadoSerie || '').toUpperCase();
      const esBajaSerie = serieEstado === 'BAJA';
      const esBajaGlobal = eUp === 'BAJA';

      // Solo incluir si: la serie individual está en baja, O el activo global está en baja (activos con 1 sola serie o sin series)
      if (!esBajaSerie && !esBajaGlobal) return;
      // Si el activo tiene múltiples series y el estado global es baja pero esta serie no, verificar
      if (_seriesList.length > 1 && !esBajaSerie && esBajaGlobal) return;

      // Verificar que no esté ya ejecutado (en historial)
      const _serieKey = (s.serie || '').toUpperCase().trim();
      const yaEjecutado = historial.some(h => h.activoId === a.id && (h.estadoBaja === 'Ejecutada') &&
        (!_serieKey || (h.serie || '').toUpperCase().trim() === _serieKey));
      if (yaEjecutado) return;

      rows.push({
        activoId: a.id,
        codigo: a.codigo || '',
        almacen: a.ubicacion || '',
        tipo: a.tipo || '',
        equipo: a.equipo || a.tipo || '',
        marca: a.marca || '',
        modelo: a.modelo || '',
        serie: s.serie || '',
        codInv: s.codInv || '',
        estadoCmdb: s.estadoSerie || a.estado || 'Baja',
        estadoEquipo: s.estadoEquipoSerie || a.estadoEquipo || '',
        antiguedad,
        fechaCompra: a.fechaCompra || '',
        costo: a.costo || 0,
        valorizado: s.valorizado || a.valorizado || 'PENDIENTE',
        etapaBaja: s.etapaBaja || a.etapaBaja || '',
        motivoBaja: s.motivoBaja || a.motivoBaja || a.obsRetorno || '',
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
  const totalValorizados = rows.filter(r => r.valorizado === 'VALOR <=0').length;
  const totalSinValorizar = rows.filter(r => r.valorizado === 'PENDIENTE').length;
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
    return r && r.valorizado === 'VALOR <=0';
  }).length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Bajas Pendientes</h1>
        <div class="subtitle">Activos registrados para baja, pendientes de ejecución definitiva</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="_exportBajasPendientes()" ${rows.length === 0 ? 'disabled' : ''}>📥 Exportar Reporte</button>
        <button class="btn btn-success" onclick="_openValorizarModal()" ${totalSinValorizar === 0 ? 'disabled' : ''} style="background:#16a34a;color:#fff">💰 Valorizar</button>
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
        <div class="stat-label">Valorizados (VALOR &lt;=0)</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><div class="stat-icon" style="background:#fffbeb;color:#d97706">⚠️</div></div>
        <div class="stat-value">${totalSinValorizar}</div>
        <div class="stat-label">Pendientes de valorizar</div>
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
          ${selAptos < selCount ? `<span style="font-size:11px;color:#d97706" title="Algunos ítems están pendientes de valorizar">⚠️ ${selCount - selAptos} pendientes</span>` : ''}
          <button class="btn btn-danger" onclick="_ejecutarBajasMasivas()" ${selAptos === 0 ? 'disabled title="Solo se pueden ejecutar bajas con valorización VALOR <=0"' : ''} style="font-weight:700">
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
  debounceSearch('bajas', _renderBajasTable);
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
    const cls = u === 'DESTRUCCIÓN' ? 'badge-danger' : u === 'VENTA' ? 'badge-info' : u === 'DONACIÓN' ? 'badge-success' : 'badge-warning';
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
            <th>Cod. Inv</th>
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
                  const canSelect = r.valorizado === 'VALOR <=0';
                  const chk = canSelect
                    ? '<input type="checkbox" ' + (isSel ? 'checked' : '') + ' onchange="_bajasToggleItem(\'' + key.replace(/'/g, "\\'") + '\')">'
                    : '<input type="checkbox" disabled title="Pendiente de valorización — no se puede ejecutar" style="opacity:.4;cursor:not-allowed">';
                  const valTd = r.valorizado === 'VALOR <=0'
                    ? '<span style="color:#10b981;font-weight:700;font-size:11px" title="Valorizado — ' + esc(r.etapaBaja || '') + '">VALOR &lt;=0</span>'
                    : '<span style="color:#d97706;font-weight:700;font-size:11px">PENDIENTE</span>';
                  return '<tr style="background:' + (isSel ? '#fef2f2' : '') + '">'
                    + '<td style="text-align:center">' + chk + '</td>'
                    + '<td style="font-size:12px">' + esc(r.almacen || '—') + '</td>'
                    + '<td style="font-size:12px;font-weight:600">' + esc(r.equipo) + '</td>'
                    + '<td style="font-size:12px">' + esc(r.marca) + '</td>'
                    + '<td style="font-size:12px">' + esc(r.modelo) + '</td>'
                    + '<td style="font-size:11px;font-family:monospace">' + esc(r.serie || '—') + '</td>'
                    + '<td style="font-size:11px;font-family:monospace">' + esc(r.codInv || '—') + '</td>'
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
    if (r.valorizado !== 'VALOR <=0') return; // Skip non-valorized
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
        ${_f('Cod. Inv', (a.series||[]).map(s=>s.codInv).join(', ') || '—')}
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
    'COD_INV': r.codInv,
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
    'VALORIZADO': r.valorizado,
    'ETAPA_BAJA': r.etapaBaja || '',
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
  const selRows = rows.filter(r => _bajasSeleccionadas.has(r.activoId + '||' + r.serie) && r.valorizado === 'VALOR <=0');
  if (selRows.length === 0) { showToast('No hay ítems válidos seleccionados (solo se ejecutan valorizados)', 'error'); return; }

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
  const selRows = rows.filter(r => _bajasSeleccionadas.has(r.activoId + '||' + r.serie) && r.valorizado === 'VALOR <=0');
  if (selRows.length === 0) { showToast('No hay ítems válidos', 'error'); return; }

  const activos = DB.get('activos');
  const historial = DB.get('historialBajas');

  selRows.forEach(r => {
    const activo = activos.find(a => a.id === r.activoId);
    if (activo) {
      // Marcar serie y activo como dado de baja (1 activo = 1 serie)
      const _serieKey = (r.serie || '').toUpperCase().trim();
      if (_serieKey && activo.series && activo.series.length > 0) {
        const serieObj = activo.series.find(s => (s.serie || '').toUpperCase().trim() === _serieKey);
        if (serieObj) {
          serieObj.estadoSerie = 'Baja';
          serieObj.fechaBajaEjecutada = fechaSalida;
        }
      }
      activo.estado = 'Baja';
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
      codInv: r.codInv,
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
      etapaBaja: r.etapaBaja || '',
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
      codInv: r.codInv || '',
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

/* --- Valorizar bajas pendientes --- */
function _openValorizarModal() {
  const rows = _buildBajasRows().filter(r => r.valorizado === 'PENDIENTE');
  if (rows.length === 0) { showToast('No hay equipos pendientes de valorizar', 'info'); return; }
  window._valorizarRows = rows;

  openModal('💰 Valorizar Equipos en Baja', `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">💰</span>
        <span>Cargue las series valorizadas por Finanzas y adjunte la documentación sustentatoria. Las series encontradas cambiarán a <strong>VALOR &lt;=0</strong>.</span>
      </div>

      <!-- Etapa y fecha -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Nombre de Etapa <span class="required">*</span></label>
          <input class="form-control" id="valEtapaNombre" placeholder="Ej: BAJA 2026-1" style="height:38px;font-size:12px">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;display:block">Fecha de valorización</label>
          <input type="date" class="form-control" id="valFecha" value="${today()}" style="height:38px;font-size:12px">
        </div>
      </div>

      <!-- 1. Series masivas -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <div style="font-size:13px;font-weight:700;color:#334155;display:flex;align-items:center;gap:6px">📋 Adjuntar series valorizadas <span class="required">*</span></div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">Descargue el formato, complete las series valorizadas y súbalo aquí</div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="_descargarFormatoValorizacion()" style="font-size:11px;white-space:nowrap">📥 Descargar formato</button>
        </div>
        <div id="valSeriesWrap" style="border:2px dashed #cbd5e1;border-radius:8px;padding:14px;text-align:center;background:#fff;cursor:pointer;transition:all .15s"
          onclick="document.getElementById('valSeriesInput').click()"
          onmouseover="this.style.borderColor='#2563eb';this.style.background='#eff6ff'"
          onmouseout="this.style.borderColor='#cbd5e1';this.style.background='#fff'">
          <input type="file" id="valSeriesInput" accept=".xlsx,.xls,.csv" style="display:none" onchange="_onValSeriesUpload(this)">
          <div id="valSeriesLabel" style="color:#94a3b8;font-size:12px">
            <div style="font-size:24px;margin-bottom:4px">📋</div>
            Haga clic para subir el Excel con las series valorizadas<br>
            <span style="font-size:10px;color:#cbd5e1">XLSX, XLS, CSV — máx. 10MB</span>
          </div>
        </div>
        <div id="valSeriesResult" style="display:none;margin-top:10px"></div>
      </div>

      <!-- 2. Documentación sustentatoria -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px">
        <div style="margin-bottom:10px">
          <div style="font-size:13px;font-weight:700;color:#334155;display:flex;align-items:center;gap:6px">📎 Documentación sustentatoria <span class="required">*</span></div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">Certificado de baja, informe de Finanzas u otro documento de respaldo (PDF, Excel)</div>
        </div>
        <div id="valDocWrap" style="border:2px dashed #cbd5e1;border-radius:8px;padding:14px;text-align:center;background:#fff;cursor:pointer;transition:all .15s"
          onclick="document.getElementById('valDocInput').click()"
          onmouseover="this.style.borderColor='#2563eb';this.style.background='#eff6ff'"
          onmouseout="this.style.borderColor='#cbd5e1';this.style.background='#fff'">
          <input type="file" id="valDocInput" accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png" style="display:none" onchange="_onValDocChange(this)">
          <div id="valDocLabel" style="color:#94a3b8;font-size:12px">
            <div style="font-size:24px;margin-bottom:4px">📎</div>
            Haga clic para adjuntar documentación sustentatoria<br>
            <span style="font-size:10px;color:#cbd5e1">PDF, XLSX, DOC, JPG, PNG — máx. 10MB</span>
          </div>
        </div>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-success" onclick="_confirmarValorizacion()" style="background:#16a34a;color:#fff;font-weight:700">💰 Confirmar Valorización</button>
  `, 'modal-lg');

  window._valSeriesFile = null;
  window._valDocFile = null;
  window._valSeriesMatched = [];
}

function _descargarFormatoValorizacion() {
  const rows = window._valorizarRows || _buildBajasRows().filter(r => r.valorizado === 'PENDIENTE');
  const data = rows.map(r => ({ 'SERIE': r.serie }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Series Pendientes');
  XLSX.writeFile(wb, 'Formato_Valorizacion_' + today().replace(/-/g, '') + '.xlsx');
  showToast('Formato descargado. Deje solo las series valorizadas y vuelva a subir el archivo.');
}

function _onValSeriesUpload(input) {
  const file = input.files && input.files[0];
  const label = document.getElementById('valSeriesLabel');
  const wrap = document.getElementById('valSeriesWrap');
  const resultDiv = document.getElementById('valSeriesResult');
  if (!file) { window._valSeriesFile = null; window._valSeriesMatched = []; if (resultDiv) resultDiv.style.display = 'none'; return; }
  if (file.size > 10 * 1024 * 1024) { showToast('El archivo excede 10MB', 'error'); input.value = ''; return; }

  window._valSeriesFile = file;
  if (label) label.innerHTML = '<div style="font-size:24px;margin-bottom:4px">✅</div><strong>' + esc(file.name) + '</strong><br><span style="font-size:10px;color:#10b981">Archivo cargado — clic para cambiar</span>';
  if (wrap) { wrap.style.borderColor = '#10b981'; wrap.style.background = '#f0fdf4'; }

  // Leer Excel y buscar series
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Buscar columna SERIE y VALORIZADO
      const pendRows = window._valorizarRows || [];
      const pendMap = {};
      pendRows.forEach(r => { pendMap[(r.serie || '').toUpperCase().trim()] = r; });

      const matched = [];
      const notFound = [];
      data.forEach(row => {
        const serie = String(row.SERIE || row.serie || row.Serie || '').toUpperCase().trim();
        if (!serie) return;
        if (pendMap[serie]) matched.push(pendMap[serie]);
        else notFound.push(serie);
      });

      window._valSeriesMatched = matched;
      if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <span style="font-size:12px;font-weight:700;color:#16a34a">✅ ${matched.length} serie(s) encontrada(s)</span>
            ${notFound.length > 0 ? `<span style="font-size:12px;color:#d97706">⚠️ ${notFound.length} serie(s) no encontrada(s) en pendientes</span>` : ''}
          </div>
          ${matched.length > 0 ? `<div style="margin-top:8px;max-height:120px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;padding:6px">
            ${matched.map(r => `<span style="display:inline-block;background:#dcfce7;border:1px solid #a7f3d0;border-radius:4px;padding:2px 8px;margin:2px;font-family:monospace;font-size:10px">${esc(r.codigo)} — ${esc(r.serie)}</span>`).join('')}
          </div>` : ''}
          ${notFound.length > 0 ? `<div style="margin-top:6px;font-size:10px;color:#d97706">No encontradas: ${notFound.map(s => '<code>' + esc(s) + '</code>').join(', ')}</div>` : ''}
        `;
      }
    } catch (err) {
      showToast('Error al leer el archivo: ' + err.message, 'error');
      window._valSeriesMatched = [];
      if (resultDiv) { resultDiv.style.display = 'block'; resultDiv.innerHTML = '<span style="color:#dc2626;font-size:12px">Error al procesar el archivo</span>'; }
    }
  };
  reader.readAsArrayBuffer(file);
}

function _onValDocChange(input) {
  const file = input.files && input.files[0];
  const label = document.getElementById('valDocLabel');
  const wrap = document.getElementById('valDocWrap');
  if (!file) { window._valDocFile = null; return; }
  if (file.size > 10 * 1024 * 1024) { showToast('El archivo excede 10MB', 'error'); input.value = ''; return; }
  window._valDocFile = file;
  if (label) label.innerHTML = '<div style="font-size:24px;margin-bottom:4px">✅</div><strong>' + esc(file.name) + '</strong><br><span style="font-size:10px;color:#10b981">Documento adjunto — clic para cambiar</span>';
  if (wrap) { wrap.style.borderColor = '#10b981'; wrap.style.background = '#f0fdf4'; }
}

function _confirmarValorizacion() {
  const etapa = ((document.getElementById('valEtapaNombre') || {}).value || '').trim();
  const fecha = ((document.getElementById('valFecha') || {}).value || '').trim();
  if (!etapa) { showToast('Ingrese el nombre de la etapa de baja', 'error'); return; }
  if (!window._valSeriesFile) { showToast('Debe subir el Excel con las series valorizadas', 'error'); return; }
  if (!window._valDocFile) { showToast('Debe adjuntar la documentación sustentatoria', 'error'); return; }
  const matched = window._valSeriesMatched || [];
  if (matched.length === 0) { showToast('No se encontraron series pendientes en el archivo. Verifique que la columna SERIE contenga series válidas.', 'error'); return; }

  if (!confirm(`Se valorizarán ${matched.length} serie(s) en la etapa "${etapa}". ¿Continuar?`)) return;

  const activos = DB.get('activos');
  let count = 0;

  matched.forEach(r => {
    const activo = activos.find(a => a.id === r.activoId);
    if (!activo) return;

    if (r.serie && activo.series && activo.series.length > 0) {
      const serieObj = activo.series.find(s => (s.serie || '').toUpperCase().trim() === (r.serie || '').toUpperCase().trim());
      if (serieObj) {
        serieObj.valorizado = 'VALOR <=0';
        serieObj.etapaBaja = etapa;
        serieObj.fechaValorizacion = fecha;
        serieObj.archivoSeries = window._valSeriesFile.name;
        serieObj.archivoSustento = window._valDocFile.name;
        count++;
      }
    } else {
      activo.valorizado = 'VALOR <=0';
      activo.etapaBaja = etapa;
      activo.fechaValorizacion = fecha;
      activo.archivoSeries = window._valSeriesFile.name;
      activo.archivoSustento = window._valDocFile.name;
      count++;
    }
  });

  DB.set('activos', activos);
  addMovimiento('Valorización de Bajas', `${count} equipo(s) valorizados — Etapa: ${etapa} — Series: ${window._valSeriesFile.name} — Sustento: ${window._valDocFile.name}`);

  closeModal();
  showToast(`${count} equipo(s) valorizados correctamente en etapa "${etapa}"`);
  renderBajasPendientes(document.getElementById('contentArea'));
}

function openBajaModal() {
  const activos = DB.get('activos').filter(a => {
    const e = (a.estado||'').toUpperCase();
    return e !== 'BAJA';
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
    codInv: activo.codInv || '',
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
          <thead><tr><th>ID</th><th>Activo</th><th>Tipo</th><th>Serie</th><th>Etapa Baja</th><th>Motivo</th><th>Solicitante</th><th>F. Salida</th><th>Guía</th><th>Estado</th></tr></thead>
          <tbody>
            ${historial.length === 0
              ? '<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">📂</div><h3>Sin historial</h3><p>No hay registros de bajas</p></div></td></tr>'
              : pagSlice(historial, 'histBajas').map(b => `
                  <tr>
                    <td>${b.id}</td>
                    <td><strong>${esc(b.activoCodigo)}</strong></td>
                    <td>${esc(b.activoTipo)}</td>
                    <td style="font-family:monospace;font-size:11px">${esc(b.serie || '—')}</td>
                    <td><span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${esc(b.etapaBaja || '—')}</span></td>
                    <td>${esc(b.motivoBaja || b.motivo || '')}</td>
                    <td>${esc(b.solicitante)}</td>
                    <td>${formatDate(b.fechaSalida || b.fecha)}</td>
                    <td style="font-size:11px">${esc(b.numGuia || '—')}</td>
                    <td>
                      <span class="badge ${b.estadoBaja === 'Ejecutada' ? 'badge-success' : b.estadoBaja === 'Aprobada' ? 'badge-success' : 'badge-danger'}">
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
  // Estado CMDB oculto — los estados son parte de la lógica interna (Disponible, Asignado, Baja, etc.)
  // { key: 'estados',       label: 'Estado CMDB' },
  // Estado Equipo oculto — valores fijos del sistema (NUEVO, BUENO, REGULAR, MALO, OBSOLETO)
  // { key: 'estadosEquipo', label: 'Estado Equipo' },
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
  // Tipo de Puesto oculto — ahora es campo de texto libre "Puesto"
  // { key: 'tipoPuesto',    label: 'Tipo de Puesto', perfil: 'Administrativo' },
  { key: 'tipoAsignacion', label: 'Motivos' },
  { key: 'tiposRepuesto', label: 'Repuestos' },
  { key: 'mapeoEPAdmin', label: 'EP-ADMIN (Equipo Principal)' },
  { key: 'mapeoAdicErg', label: 'ADIC-ERG (Accesorios Ergonómicos)' }
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
  keysToReset.forEach(k => DB.remove(k));

  showToast('Datos operativos eliminados correctamente.', 'info');
  setTimeout(() => renderPage(), 500);
}

/* ═══════════════════════════════════════════════════════
   RECOVER DATA FROM INDEXEDDB → LOCALSTORAGE
   ═══════════════════════════════════════════════════════ */
function _recoverFromIndexedDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) { resolve(); return; }
    const req = indexedDB.open('ati_cmddb', 1);
    req.onerror = () => resolve();
    req.onupgradeneeded = (e) => {
      // DB didn't exist, nothing to recover
      e.target.transaction.abort();
      resolve();
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('data')) { db.close(); resolve(); return; }
      const tx = db.transaction('data', 'readonly');
      const store = tx.objectStore('data');
      const reqAll = store.getAll();
      const reqKeys = store.getAllKeys();
      let keys = [], vals = [];
      reqKeys.onsuccess = () => { keys = reqKeys.result; };
      reqAll.onsuccess = () => {
        vals = reqAll.result;
        let recovered = 0;
        keys.forEach((k, i) => {
          if (k && (k.startsWith('ati_') || k.startsWith('ati_cfg_'))) {
            // Solo copiar si localStorage no tiene datos o tiene array vacio
            const existing = localStorage.getItem(k);
            if (!existing || existing === '[]' || existing === 'null') {
              try {
                const val = vals[i];
                if (val && (Array.isArray(val) ? val.length > 0 : true)) {
                  localStorage.setItem(k, JSON.stringify(val));
                  recovered++;
                }
              } catch { /* ignore */ }
            }
          }
        });
        if (recovered > 0) console.log('Recovered ' + recovered + ' keys from IndexedDB to localStorage');
        db.close();
        resolve();
      };
      reqAll.onerror = () => { db.close(); resolve(); };
    };
  });
}

/* ═══════════════════════════════════════════════════════
   APP INITIALIZATION
   ═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async function () {
  // 1. Recuperar datos de IndexedDB a localStorage (si existen)
  try { await _recoverFromIndexedDB(); } catch (e) { console.warn('IndexedDB recovery skipped:', e); }

  // 2. Inicializar DB (localStorage - sincrono)
  await DB.init();

  // 3. Inicializar datos por defecto / migraciones
  initSampleData();
  validarMapeoEstados();

  // 4. Restaurar sesión y arrancar la app
  const hasSession = checkSession();
  if (hasSession) {
    restoreSidebarState();
    buildSidebar();
    updateBreadcrumb();
    renderPage();
  }
});
