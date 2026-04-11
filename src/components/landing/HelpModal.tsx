import React from 'react'

export const HelpModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div role="dialog" aria-label="Ayuda">
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#0b1220', color: '#fff', padding: 20, borderRadius: 12, maxWidth: 520, width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Ayuda rápida</h3>
          <ul style={{ marginTop: 12, paddingLeft: 18 }}>
            <li>Si eres nuevo, empieza con la configuración por defecto y observa KPIs simples.</li>
            <li>Usa el endpoint /health y /api/ai/status para entender la integración de IA.</li>
            <li>La IA puede cambiar entre OpenCode y otros proveedores sin tocar el flujo de negocio.</li>
          </ul>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={onClose} style={{ background: '#1e3a8a', color: '#fff', padding: '6px 12px', borderRadius: 6, border: 'none' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
