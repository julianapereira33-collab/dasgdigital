// Medidas da cliente, na ordem da ficha. Usadas no cadastro (Clientes) e na ficha técnica (Criação).
export const MEDIDAS_CLIENTE = [
  ['Tronco', [['busto', 'Busto'], ['sob_busto', 'Sob busto'], ['cintura', 'Cintura'], ['quadril', 'Quadril'], ['ombro', 'Ombro'], ['costas', 'Costas']]],
  ['Alturas', [['altura', 'Altura total'], ['altura_cintura', 'Altura da cintura'], ['altura_decote', 'Altura do decote']]],
  ['Comprimentos', [['compr_vestido', 'Comprimento do vestido'], ['compr_saia', 'Comprimento da saia'], ['compr_calca', 'Comprimento da calça'], ['compr_blusa', 'Comprimento da blusa'], ['ombro_joelho', 'Ombro ao joelho'], ['ombro_chao', 'Ombro ao chão'], ['entrepernas', 'Entrepernas']]],
  ['Braço', [['manga', 'Comprimento da manga'], ['cava', 'Cava'], ['largura_braco', 'Largura do braço']]],
];
export const TODAS_MEDIDAS = MEDIDAS_CLIENTE.flatMap(([, l]) => l);
