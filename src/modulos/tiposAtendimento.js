export const TIPOS_ATENDIMENTO = {
  estilista_express: { label: 'Estilista Express', quiz: true, pagamento: 'da estilista express' },
  consultoria_express: { label: 'Consultoria Express', quiz: true, pagamento: 'da consultoria' },
  atendimento: { label: 'Atendimento (sem quiz)', quiz: false, pagamento: 'do atendimento' },
};
export const tipoDaOS = (os) => TIPOS_ATENDIMENTO[os?.tipo_atendimento] || TIPOS_ATENDIMENTO.consultoria_express;
