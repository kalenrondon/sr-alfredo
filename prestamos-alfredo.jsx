import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, ChevronRight, Trash2, Pencil, X,
  Phone, Users, Wallet, TrendingUp, Landmark, Calendar, Coins, History, Bell
} from 'lucide-react';

const MES_MS = 1000 * 60 * 60 * 24 * 30.4375;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function calcularPrestamo(prestamo) {
  const tasaMensual = prestamo.tasaPeriodo === 'anual' ? prestamo.tasa / 12 : Number(prestamo.tasa);
  let balance = Number(prestamo.capital);
  let interes = 0;
  let lastDate = new Date(prestamo.fechaInicio + 'T00:00:00');
  const abonos = [...(prestamo.abonos || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  let fechaPago = null;

  for (const abono of abonos) {
    const d = new Date(abono.fecha + 'T00:00:00');
    const meses = Math.max(0, (d - lastDate) / MES_MS);
    interes += balance * (tasaMensual / 100) * meses;
    let monto = Number(abono.monto);
    if (monto <= interes + 0.005) {
      interes -= monto;
    } else {
      monto -= interes;
      interes = 0;
      balance = Math.max(0, balance - monto);
    }
    lastDate = d;
    if (fechaPago === null && balance <= 1 && interes <= 1) {
      fechaPago = abono.fecha;
    }
  }

  const hoy = new Date();
  const mesesHoy = Math.max(0, (hoy - lastDate) / MES_MS);
  interes += balance * (tasaMensual / 100) * mesesHoy;
  const saldoTotal = balance + interes;

  let estado = 'al_dia';
  let fechaVencimiento = null;
  if (prestamo.plazoMeses) {
    const vencimiento = new Date(prestamo.fechaInicio + 'T00:00:00');
    vencimiento.setMonth(vencimiento.getMonth() + Number(prestamo.plazoMeses));
    fechaVencimiento = vencimiento.toISOString().slice(0, 10);
    if (saldoTotal > 1 && hoy > vencimiento) estado = 'atrasado';
  }
  if (saldoTotal <= 1) {
    estado = 'pagado';
  }

  return {
    capitalPendiente: balance, interesAcumulado: interes, saldoTotal, tasaMensual, estado,
    fechaPago: estado === 'pagado' ? fechaPago : null,
    fechaVencimiento,
  };
}

function formatMiles(digitos) {
  if (!digitos) return '';
  return Number(digitos).toLocaleString('es-CO');
}

function soloDigitos(valor) {
  return (valor || '').toString().replace(/\D/g, '');
}

function MoneyInput({ value, onChange, placeholder }) {
  return (
    <input
      className="input-field font-mono"
      inputMode="numeric"
      value={formatMiles(value)}
      onChange={(e) => onChange(soloDigitos(e.target.value))}
      placeholder={placeholder}
    />
  );
}

function formatCOP(n) {
  return Math.round(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function formatFecha(f) {
  if (!f) return '—';
  return new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ESTADO_LABEL = { al_dia: 'AL DÍA', atrasado: 'ATRASADO', pagado: 'PAGADO' };
const ESTADO_CLASS = { al_dia: 'stamp-verde', atrasado: 'stamp-rojo', pagado: 'stamp-dorado' };

function Stamp({ estado }) {
  return <span className={`stamp ${ESTADO_CLASS[estado]}`}>{ESTADO_LABEL[estado]}</span>;
}

function Pill({ label, cls }) {
  return <span className={`pill pill-${cls}`}>{label}</span>;
}

function calcularComportamiento(prestamosConCalc) {
  let evaluados = 0;
  let tarde = 0;
  prestamosConCalc.forEach((pr) => {
    if (!pr.plazoMeses) return; // sin plazo no hay con qué medir puntualidad
    if (pr.calc.estado === 'pagado') {
      evaluados++;
      if (pr.calc.fechaPago && pr.calc.fechaVencimiento && pr.calc.fechaPago > pr.calc.fechaVencimiento) tarde++;
    } else if (pr.calc.estado === 'atrasado') {
      evaluados++;
      tarde++;
    } else if (pr.calc.estado === 'al_dia') {
      evaluados++;
    }
  });
  if (evaluados === 0) return null;
  const ratio = tarde / evaluados;
  if (ratio === 0) return { label: 'Paga al día', cls: 'verde' };
  if (ratio <= 0.5) return { label: 'A veces se atrasa', cls: 'dorado' };
  return { label: 'Suele atrasarse', cls: 'rojo' };
}

function labelAviso(dias) {
  if (dias < 0) return { text: `Vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`, cls: 'rojo' };
  if (dias === 0) return { text: 'Vence hoy', cls: 'rojo' };
  return { text: `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`, cls: 'dorado' };
}

function ModalShell({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(34,65,46,0.45)', zIndex: 50 }}
      onClick={onClose}
    >
      <div
        className={`ledger-card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6`}
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg" style={{ color: 'var(--ink)' }}>{title}</h3>
          <button onClick={onClose} className="btn-icon" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-semibold mb-1.5 tracking-wide uppercase" style={{ color: 'var(--ink-soft)' }}>{label}</span>
      {children}
    </label>
  );
}

export default function App() {
  const [data, setData] = useState({ personas: [], prestamos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState(null);

  const [modalPersona, setModalPersona] = useState(null); // {mode:'add'|'edit', persona?}
  const [formPersona, setFormPersona] = useState({ nombre: '', telefono: '', nota: '' });

  const [modalPrestamo, setModalPrestamo] = useState(null); // {mode, personaId, prestamo?}
  const [formPrestamo, setFormPrestamo] = useState({
    capital: '', tasa: '', tasaPeriodo: 'mensual', fechaInicio: '', plazoMeses: '', notas: ''
  });

  const [modalAbono, setModalAbono] = useState(null); // {prestamoId}
  const [formAbono, setFormAbono] = useState({ fecha: '', monto: '' });
  const [abonoError, setAbonoError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get('ledger_data', false);
        if (res && res.value) setData(JSON.parse(res.value));
      } catch (e) {
        // sin datos previos todavía
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(newData) {
    setData(newData);
    try {
      const result = await window.storage.set('ledger_data', JSON.stringify(newData), false);
      if (!result) setError('No se pudo guardar el cambio. Intenta de nuevo.');
      else setError('');
    } catch (e) {
      setError('No se pudo guardar el cambio. Intenta de nuevo.');
    }
  }

  // ---------- Personas ----------
  function openAddPersona() {
    setFormPersona({ nombre: '', telefono: '', nota: '' });
    setModalPersona({ mode: 'add' });
  }
  function openEditPersona(p) {
    setFormPersona({ nombre: p.nombre, telefono: p.telefono || '', nota: p.nota || '' });
    setModalPersona({ mode: 'edit', persona: p });
  }
  function submitPersona() {
    if (!formPersona.nombre.trim()) return;
    if (modalPersona.mode === 'add') {
      const nueva = { id: uid(), nombre: formPersona.nombre.trim(), telefono: formPersona.telefono.trim(), nota: formPersona.nota.trim() };
      persist({ ...data, personas: [...data.personas, nueva] });
    } else {
      const personas = data.personas.map((p) => p.id === modalPersona.persona.id
        ? { ...p, nombre: formPersona.nombre.trim(), telefono: formPersona.telefono.trim(), nota: formPersona.nota.trim() }
        : p);
      persist({ ...data, personas });
    }
    setModalPersona(null);
  }
  function eliminarPersona(p) {
    if (!window.confirm(`¿Eliminar a ${p.nombre} y todos sus préstamos? Esto no se puede deshacer.`)) return;
    persist({
      personas: data.personas.filter((x) => x.id !== p.id),
      prestamos: data.prestamos.filter((x) => x.personaId !== p.id),
    });
    setSelectedPersonaId(null);
  }

  // ---------- Préstamos ----------
  function openAddPrestamo(personaId) {
    setFormPrestamo({ capital: '', tasa: '', tasaPeriodo: 'mensual', fechaInicio: new Date().toISOString().slice(0, 10), plazoMeses: '', notas: '' });
    setModalPrestamo({ mode: 'add', personaId });
  }
  function openEditPrestamo(pr) {
    setFormPrestamo({
      capital: pr.capital, tasa: pr.tasa, tasaPeriodo: pr.tasaPeriodo,
      fechaInicio: pr.fechaInicio, plazoMeses: pr.plazoMeses || '', notas: pr.notas || ''
    });
    setModalPrestamo({ mode: 'edit', prestamo: pr });
  }
  function submitPrestamo() {
    const capital = Number(formPrestamo.capital);
    const tasa = Number(formPrestamo.tasa);
    if (!capital || capital <= 0 || !formPrestamo.fechaInicio || isNaN(tasa) || tasa < 0) return;
    if (modalPrestamo.mode === 'add') {
      const nuevo = {
        id: uid(), personaId: modalPrestamo.personaId, capital, tasa, tasaPeriodo: formPrestamo.tasaPeriodo,
        fechaInicio: formPrestamo.fechaInicio, plazoMeses: formPrestamo.plazoMeses ? Number(formPrestamo.plazoMeses) : null,
        notas: formPrestamo.notas.trim(), abonos: []
      };
      persist({ ...data, prestamos: [...data.prestamos, nuevo] });
    } else {
      const prestamos = data.prestamos.map((pr) => pr.id === modalPrestamo.prestamo.id
        ? { ...pr, capital, tasa, tasaPeriodo: formPrestamo.tasaPeriodo, fechaInicio: formPrestamo.fechaInicio,
            plazoMeses: formPrestamo.plazoMeses ? Number(formPrestamo.plazoMeses) : null, notas: formPrestamo.notas.trim() }
        : pr);
      persist({ ...data, prestamos });
    }
    setModalPrestamo(null);
  }
  function eliminarPrestamo(pr) {
    if (!window.confirm('¿Eliminar este préstamo y su historial de abonos?')) return;
    persist({ ...data, prestamos: data.prestamos.filter((x) => x.id !== pr.id) });
  }

  // ---------- Abonos ----------
  function openAddAbono(prestamo) {
    const pagoSugerido = Math.round(prestamo.calc.capitalPendiente * (prestamo.calc.tasaMensual / 100));
    setFormAbono({ fecha: new Date().toISOString().slice(0, 10), monto: pagoSugerido > 0 ? String(pagoSugerido) : '' });
    setAbonoError('');
    setModalAbono({ prestamoId: prestamo.id });
  }
  function submitAbono() {
    const monto = Number(formAbono.monto);
    if (!monto || monto <= 0 || !formAbono.fecha) return;

    const prestamo = data.prestamos.find((pr) => pr.id === modalAbono.prestamoId);
    if (prestamo) {
      const calc = calcularPrestamo(prestamo);
      if (monto > calc.saldoTotal + 1) {
        setAbonoError(`Ese monto es mayor a lo que debe. Actualmente debe ${formatCOP(calc.saldoTotal)}, no ${formatCOP(monto)}. Revisa el número e intenta de nuevo.`);
        return;
      }
    }

    setAbonoError('');
    const prestamos = data.prestamos.map((pr) => pr.id === modalAbono.prestamoId
      ? { ...pr, abonos: [...(pr.abonos || []), { id: uid(), fecha: formAbono.fecha, monto }] }
      : pr);
    persist({ ...data, prestamos });
    setModalAbono(null);
  }
  function eliminarAbono(prestamoId, abonoId) {
    const prestamos = data.prestamos.map((pr) => pr.id === prestamoId
      ? { ...pr, abonos: pr.abonos.filter((a) => a.id !== abonoId) }
      : pr);
    persist({ ...data, prestamos });
  }

  // ---------- Derivados ----------
  const personasConDatos = useMemo(() => {
    return data.personas.map((p) => {
      const prestamos = data.prestamos.filter((pr) => pr.personaId === p.id).map((pr) => ({ ...pr, calc: calcularPrestamo(pr) }));
      const saldoTotal = prestamos.reduce((acc, pr) => acc + pr.calc.saldoTotal, 0);
      const orden = { atrasado: 0, al_dia: 1, pagado: 2 };
      const estado = prestamos.length === 0 ? 'sin_prestamos' : prestamos.map((pr) => pr.calc.estado).sort((a, b) => orden[a] - orden[b])[0];
      const comportamiento = calcularComportamiento(prestamos);
      return { ...p, prestamos, saldoTotal, estado, comportamiento };
    });
  }, [data]);

  const filtradas = personasConDatos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.telefono || '').includes(search)
  );

  const selectedPersona = personasConDatos.find((p) => p.id === selectedPersonaId) || null;

  const totales = useMemo(() => {
    let capitalActivo = 0, porCobrar = 0, cobrado = 0;
    const personasActivasSet = new Set();
    data.prestamos.forEach((pr) => {
      const calc = calcularPrestamo(pr);
      if (calc.estado !== 'pagado') {
        capitalActivo += calc.capitalPendiente;
        porCobrar += calc.saldoTotal;
        personasActivasSet.add(pr.personaId);
      }
      (pr.abonos || []).forEach((a) => { cobrado += Number(a.monto); });
    });
    return { capitalActivo, porCobrar, cobrado, personasActivas: personasActivasSet.size };
  }, [data]);

  const avisos = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const items = [];
    personasConDatos.forEach((p) => {
      p.prestamos.forEach((pr) => {
        if (pr.calc.estado === 'pagado' || !pr.calc.fechaVencimiento) return;
        const venc = new Date(pr.calc.fechaVencimiento + 'T00:00:00');
        const dias = Math.round((venc - hoy) / (1000 * 60 * 60 * 24));
        if (dias <= 7) {
          items.push({ prestamoId: pr.id, personaId: p.id, personaNombre: p.nombre, saldo: pr.calc.saldoTotal, dias });
        }
      });
    });
    return items.sort((a, b) => a.dias - b.dias);
  }, [personasConDatos]);

  const historialGlobal = useMemo(() => {
    const filas = [];
    data.prestamos.forEach((pr) => {
      const persona = data.personas.find((p) => p.id === pr.personaId);
      (pr.abonos || []).forEach((a) => {
        filas.push({ id: a.id, fecha: a.fecha, monto: a.monto, personaNombre: persona ? persona.nombre : '—' });
      });
    });
    return filas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [data]);

  const [showHistorial, setShowHistorial] = useState(false);



  return (
    <div className="app-root min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;500;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

        :root {
          --paper: #EFE8D8;
          --paper-2: #E4DCC6;
          --card: #FBF8F1;
          --ink: #22412E;
          --ink-soft: #5B6F5F;
          --gold: #B8862B;
          --gold-soft: #D9A94A;
          --red: #A03A3A;
          --green: #2F5233;
          --line: #CFC4A3;
        }
        .app-root { background: var(--paper); font-family: 'Inter', sans-serif; color: var(--ink); }
        .font-display { font-family: 'Roboto Slab', serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .ledger-card { background: var(--card); border: 1px solid var(--line); border-radius: 6px; }
        .ledger-line { border-bottom: 1px solid var(--line); }
        .stamp {
          display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px;
          border: 2px solid currentColor; border-radius: 3px; font-family: 'Roboto Slab', serif;
          font-weight: 700; font-size: 10.5px; letter-spacing: 0.09em; text-transform: uppercase;
          transform: rotate(-3deg); white-space: nowrap;
        }
        .stamp-verde { color: var(--green); }
        .stamp-rojo { color: var(--red); }
        .stamp-dorado { color: var(--gold); }
        .pill {
          display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px;
          font-size: 11px; font-weight: 600;
        }
        .pill-verde { background: #E3EDE4; color: var(--green); }
        .pill-dorado { background: #F3E7CE; color: var(--gold); }
        .pill-rojo { background: #F3E3E3; color: var(--red); }
        .aviso-row { border-left: 3px solid var(--line); transition: background 0.15s; }
        .aviso-row:hover { background: var(--paper-2); }
        .aviso-rojo { border-left-color: var(--red); }
        .aviso-dorado { border-left-color: var(--gold); }
        .btn-primary {
          background: var(--ink); color: var(--paper-2); font-weight: 600; font-size: 14px;
          padding: 9px 16px; border-radius: 5px; display: inline-flex; align-items: center; gap: 6px;
          transition: opacity 0.15s;
        }
        .btn-primary:hover { opacity: 0.85; }
        .btn-secondary {
          background: transparent; color: var(--ink); border: 1.5px solid var(--line); font-weight: 500; font-size: 13px;
          padding: 7px 12px; border-radius: 5px; display: inline-flex; align-items: center; gap: 6px;
          transition: background 0.15s;
        }
        .btn-secondary:hover { background: var(--paper-2); }
        .btn-danger { color: var(--red); }
        .btn-icon {
          width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;
          border-radius: 5px; color: var(--ink-soft); transition: background 0.15s;
        }
        .btn-icon:hover { background: var(--paper-2); color: var(--ink); }
        .input-field {
          width: 100%; background: var(--paper); border: 1.5px solid var(--line); border-radius: 5px;
          padding: 9px 11px; font-size: 14px; color: var(--ink); outline: none; font-family: 'Inter', sans-serif;
        }
        .input-field:focus { border-color: var(--gold); }
        .input-field.font-mono:focus { border-color: var(--gold); }
        select.input-field { cursor: pointer; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-8 md:px-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <Landmark size={28} style={{ color: 'var(--gold)' }} />
          <h1 className="font-display text-3xl" style={{ color: 'var(--ink)' }}>Cuentas Claras</h1>
        </div>
        <p className="mb-7 text-sm" style={{ color: 'var(--ink-soft)' }}>
          El libro de préstamos de Alfredo — cuentas claras, amistades largas.
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 rounded text-sm" style={{ background: '#F3E3E3', color: 'var(--red)' }}>
            {error}
          </div>
        )}

        {/* Resumen */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          <div className="ledger-card p-4">
            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'var(--ink-soft)' }}>
              <Wallet size={15} /><span className="text-xs uppercase tracking-wide font-semibold">Prestado activo</span>
            </div>
            <div className="font-mono text-xl font-semibold">{formatCOP(totales.capitalActivo)}</div>
          </div>
          <div className="ledger-card p-4">
            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'var(--ink-soft)' }}>
              <TrendingUp size={15} /><span className="text-xs uppercase tracking-wide font-semibold">Por cobrar hoy</span>
            </div>
            <div className="font-mono text-xl font-semibold" style={{ color: 'var(--gold)' }}>{formatCOP(totales.porCobrar)}</div>
          </div>
          <div className="ledger-card p-4">
            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'var(--ink-soft)' }}>
              <Coins size={15} /><span className="text-xs uppercase tracking-wide font-semibold">Cobrado en total</span>
            </div>
            <div className="font-mono text-xl font-semibold">{formatCOP(totales.cobrado)}</div>
          </div>
          <div className="ledger-card p-4">
            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'var(--ink-soft)' }}>
              <Users size={15} /><span className="text-xs uppercase tracking-wide font-semibold">Personas activas</span>
            </div>
            <div className="font-mono text-xl font-semibold">{totales.personasActivas}</div>
          </div>
        </div>

        {/* Avisos de cobro */}
        {avisos.length > 0 && (
          <div className="ledger-card p-4 mb-7">
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--ink-soft)' }}>
              <Bell size={15} /><span className="text-xs uppercase tracking-wide font-semibold">Por cobrar pronto</span>
            </div>
            <div className="flex flex-col gap-1 -mx-2">
              {avisos.map((av) => {
                const info = labelAviso(av.dias);
                return (
                  <div
                    key={av.prestamoId}
                    className={`aviso-row aviso-${info.cls} flex items-center gap-3 px-3 py-2 rounded cursor-pointer`}
                    onClick={() => setSelectedPersonaId(av.personaId)}
                  >
                    <span className="font-display text-sm flex-1 min-w-0 truncate">{av.personaNombre}</span>
                    <span className="text-xs font-semibold" style={{ color: info.cls === 'rojo' ? 'var(--red)' : 'var(--gold)' }}>{info.text}</span>
                    <span className="font-mono text-xs font-semibold" style={{ minWidth: 90, textAlign: 'right' }}>{formatCOP(av.saldo)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} style={{ color: 'var(--ink-soft)' }} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input-field"
              style={{ paddingLeft: 34 }}
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-secondary" onClick={() => setShowHistorial(true)}>
            <History size={15} /> Historial de pagos
          </button>
          <button className="btn-primary" onClick={openAddPersona}>
            <Plus size={16} /> Nueva persona
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-16" style={{ color: 'var(--ink-soft)' }}>Cargando el libro de cuentas...</div>
        ) : filtradas.length === 0 ? (
          <div className="ledger-card p-10 text-center">
            <p className="font-display text-lg mb-2">
              {data.personas.length === 0 ? 'Aún no hay nadie en el libro' : 'No se encontró a nadie con ese nombre'}
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--ink-soft)' }}>
              {data.personas.length === 0
                ? 'Agrega la primera persona para empezar a llevar las cuentas.'
                : 'Prueba con otro nombre o número de teléfono.'}
            </p>
            {data.personas.length === 0 && (
              <button className="btn-primary" onClick={openAddPersona} style={{ margin: '0 auto' }}>
                <Plus size={16} /> Agregar persona
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtradas.map((p) => (
              <div
                key={p.id}
                className="ledger-card flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setSelectedPersonaId(p.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base">{p.nombre}</span>
                    {p.estado !== 'sin_prestamos' && <Stamp estado={p.estado} />}
                    {p.comportamiento && <Pill label={p.comportamiento.label} cls={p.comportamiento.cls} />}
                  </div>
                  {p.telefono && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
                      <Phone size={12} /> {p.telefono}
                    </div>
                  )}
                </div>
                <div className="font-mono text-base font-semibold text-right" style={{ color: p.saldoTotal > 0 ? 'var(--gold)' : 'var(--ink-soft)' }}>
                  {formatCOP(p.saldoTotal)}
                </div>
                <span className="btn-icon" aria-hidden="true">
                  <ChevronRight size={18} />
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs mt-8 text-center" style={{ color: 'var(--ink-soft)' }}>
          El interés se calcula mes a mes sobre el capital pendiente. Cada abono paga primero el interés acumulado y el resto abona a capital.
        </p>
      </div>

      {/* Modal: Ficha de persona */}
      {selectedPersona && (
        <ModalShell title={selectedPersona.nombre} onClose={() => setSelectedPersonaId(null)} wide>
          {selectedPersona.comportamiento && (
            <div className="mb-3"><Pill label={selectedPersona.comportamiento.label} cls={selectedPersona.comportamiento.cls} /></div>
          )}
          {selectedPersona.telefono && (
            <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
              <Phone size={12} /> {selectedPersona.telefono}
            </div>
          )}
          {selectedPersona.nota && <p className="text-xs italic mb-3" style={{ color: 'var(--ink-soft)' }}>"{selectedPersona.nota}"</p>}

          <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => openEditPersona(selectedPersona)}>
                <Pencil size={13} /> Editar
              </button>
              <button className="btn-secondary btn-danger" onClick={() => eliminarPersona(selectedPersona)}>
                <Trash2 size={13} /> Eliminar persona
              </button>
            </div>
            <button className="btn-secondary" onClick={() => openAddPrestamo(selectedPersona.id)}>
              <Plus size={13} /> Nuevo préstamo
            </button>
          </div>

          {selectedPersona.prestamos.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--ink-soft)' }}>Esta persona no tiene préstamos todavía.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedPersona.prestamos.map((pr) => (
                <div key={pr.id} className="rounded p-3" style={{ background: 'var(--paper-2)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
                      <Calendar size={13} /> Prestado {formatFecha(pr.fechaInicio)}
                      {pr.plazoMeses ? ` · plazo ${pr.plazoMeses} ${pr.plazoMeses === 1 ? 'mes' : 'meses'}` : ''}
                      {pr.calc.estado !== 'pagado' && pr.calc.fechaVencimiento ? ` · termina el ${formatFecha(pr.calc.fechaVencimiento)}` : ''}
                      {pr.calc.estado === 'pagado' && pr.calc.fechaPago ? ` · pagado el ${formatFecha(pr.calc.fechaPago)}` : ''}
                    </div>
                    <Stamp estado={pr.calc.estado} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>Capital</div>
                      <div className="font-mono text-sm font-semibold">{formatCOP(pr.capital)}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>Tasa</div>
                      <div className="font-mono text-sm font-semibold">{pr.tasa}% {pr.tasaPeriodo}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>Saldo hoy</div>
                      <div className="font-mono text-sm font-semibold" style={{ color: 'var(--gold)' }}>{formatCOP(pr.calc.saldoTotal)}</div>
                    </div>
                  </div>

                  {pr.notas && <p className="text-xs italic mb-2" style={{ color: 'var(--ink-soft)' }}>"{pr.notas}"</p>}

                  {pr.abonos && pr.abonos.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-soft)' }}>Abonos</div>
                      <div className="flex flex-col gap-1">
                        {[...pr.abonos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map((a) => (
                          <div key={a.id} className="flex items-center justify-between text-xs font-mono">
                            <span>{formatFecha(a.fecha)}</span>
                            <span>{formatCOP(a.monto)}</span>
                            <button className="btn-icon" style={{ width: 20, height: 20 }} onClick={() => eliminarAbono(pr.id, a.id)}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={() => openAddAbono(pr)}>
                      <Plus size={13} /> Registrar abono
                    </button>
                    <button className="btn-secondary" onClick={() => openEditPrestamo(pr)}>
                      <Pencil size={13} /> Editar
                    </button>
                    <button className="btn-secondary btn-danger" onClick={() => eliminarPrestamo(pr)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      )}

      {/* Modal: Historial de pagos */}
      {showHistorial && (
        <ModalShell title="Historial de pagos" onClose={() => setShowHistorial(false)} wide>
          {historialGlobal.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--ink-soft)' }}>Todavía no se ha registrado ningún abono.</p>
          ) : (
            <div className="flex flex-col">
              {historialGlobal.map((h) => (
                <div key={h.id} className="flex items-center gap-3 py-2.5 ledger-line">
                  <span className="text-xs font-mono" style={{ color: 'var(--ink-soft)', minWidth: 90 }}>{formatFecha(h.fecha)}</span>
                  <span className="font-display text-sm flex-1 min-w-0 truncate">{h.personaNombre}</span>
                  <span className="font-mono text-sm font-semibold">{formatCOP(h.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      )}

      {/* Modal: Persona */}
      {modalPersona && (
        <ModalShell title={modalPersona.mode === 'add' ? 'Nueva persona' : 'Editar persona'} onClose={() => setModalPersona(null)}>
          <Field label="Nombre">
            <input className="input-field" value={formPersona.nombre} onChange={(e) => setFormPersona({ ...formPersona, nombre: e.target.value })} placeholder="Ej. Carlos Pérez" />
          </Field>
          <Field label="Teléfono">
            <input className="input-field" value={formPersona.telefono} onChange={(e) => setFormPersona({ ...formPersona, telefono: e.target.value })} placeholder="Ej. 300 123 4567" />
          </Field>
          <Field label="Nota (opcional)">
            <input className="input-field" value={formPersona.nota} onChange={(e) => setFormPersona({ ...formPersona, nota: e.target.value })} placeholder="Ej. compañero de trabajo" />
          </Field>
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn-secondary" onClick={() => setModalPersona(null)}>Cancelar</button>
            <button className="btn-primary" onClick={submitPersona} disabled={!formPersona.nombre.trim()}>Guardar</button>
          </div>
        </ModalShell>
      )}

      {/* Modal: Préstamo */}
      {modalPrestamo && (
        <ModalShell title={modalPrestamo.mode === 'add' ? 'Nuevo préstamo' : 'Editar préstamo'} onClose={() => setModalPrestamo(null)}>
          <Field label="Capital prestado (COP)">
            <MoneyInput value={formPrestamo.capital} onChange={(v) => setFormPrestamo({ ...formPrestamo, capital: v })} placeholder="Ej. 500.000" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tasa de interés (%)">
              <input className="input-field font-mono" type="number" step="0.1" value={formPrestamo.tasa} onChange={(e) => setFormPrestamo({ ...formPrestamo, tasa: e.target.value })} placeholder="Ej. 5" />
            </Field>
            <Field label="Periodo">
              <select className="input-field" value={formPrestamo.tasaPeriodo} onChange={(e) => setFormPrestamo({ ...formPrestamo, tasaPeriodo: e.target.value })}>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha del préstamo">
              <input className="input-field" type="date" value={formPrestamo.fechaInicio} onChange={(e) => setFormPrestamo({ ...formPrestamo, fechaInicio: e.target.value })} />
            </Field>
            <Field label="Plazo en meses (opcional)">
              <input className="input-field font-mono" type="number" value={formPrestamo.plazoMeses} onChange={(e) => setFormPrestamo({ ...formPrestamo, plazoMeses: e.target.value })} placeholder="Ej. 3" />
            </Field>
          </div>
          <Field label="Nota (opcional)">
            <input className="input-field" value={formPrestamo.notas} onChange={(e) => setFormPrestamo({ ...formPrestamo, notas: e.target.value })} placeholder="Ej. para arreglar la moto" />
          </Field>
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn-secondary" onClick={() => setModalPrestamo(null)}>Cancelar</button>
            <button className="btn-primary" onClick={submitPrestamo}>Guardar</button>
          </div>
        </ModalShell>
      )}

      {/* Modal: Abono */}
      {modalAbono && (
        <ModalShell title="Registrar abono" onClose={() => setModalAbono(null)}>
          <Field label="Fecha del abono">
            <input className="input-field" type="date" value={formAbono.fecha} onChange={(e) => setFormAbono({ ...formAbono, fecha: e.target.value })} />
          </Field>
          <Field label="Monto (COP)">
            <MoneyInput value={formAbono.monto} onChange={(v) => { setFormAbono({ ...formAbono, monto: v }); setAbonoError(''); }} placeholder="Ej. 100.000" />
          </Field>
          {abonoError ? (
            <div className="mb-3 px-3 py-2 rounded text-xs" style={{ background: '#F3E3E3', color: 'var(--red)', marginTop: -8 }}>
              {abonoError}
            </div>
          ) : (
            <p className="text-xs mb-2" style={{ color: 'var(--ink-soft)', marginTop: -8 }}>
              Ya calculamos el interés de este mes. Cámbialo si va a pagar otro monto.
            </p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn-secondary" onClick={() => setModalAbono(null)}>Cancelar</button>
            <button className="btn-primary" onClick={submitAbono}>Guardar abono</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
