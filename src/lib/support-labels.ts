// Rótulos legíveis (client-safe — sem dependência de Prisma).

export const SUPPORT_NEED_LABELS: Record<string, string> = {
  TDAH: "TDAH",
  TEA: "Autismo (TEA)",
  DISLEXIA: "Dislexia",
  DISCALCULIA: "Discalculia",
  DEFICIENCIA_INTELECTUAL: "Deficiência intelectual",
  DEFICIENCIA_FISICA: "Deficiência física",
  DEFICIENCIA_VISUAL: "Deficiência visual",
  DEFICIENCIA_AUDITIVA: "Deficiência auditiva",
  ALTAS_HABILIDADES: "Altas habilidades",
  TRANSTORNO_APRENDIZAGEM: "Transtorno de aprendizagem",
  OUTRO: "Outro",
};

export const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  LINK: "Link",
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
  PDF: "PDF",
};
