// Departamentos cadastrados no CRM entram nas listas fixas (Central de Tarefas e Agenda) sem recompilar.
export function aplicarDepartamentos(rows, listas) {
  (rows || []).filter(r => r.ativo !== false).forEach(r => {
    listas.forEach(l => {
      const atual = l[r.chave] || {};
      l[r.chave] = { ...atual, label: r.nome, curto: r.curto || r.nome, cor: r.cor || atual.cor || '#6b7280' };
    });
  });
}
