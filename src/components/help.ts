// Textos de ajuda dos campos: o que é e onde encontrar, em linguagem simples
import type { HelpContent } from './ui/HelpTip';

export const HELP = {
  revenue: {
    title: 'Faturamento do mês',
    body: 'A soma, sem descontos, de todas as notas fiscais emitidas no mês. Com várias notas, some o valor bruto de todas.',
    where: 'No emissor de notas da prefeitura ou no Portal Nacional da NFS-e: relatório das notas do mês. É o mesmo valor informado como receita no PGDAS-D.',
  },
  prolabore: {
    title: 'Pró-labore',
    body: 'O "salário" do sócio que trabalha na empresa. Dele saem o INSS (11%) e o IRRF, e ele conta como folha no Fator R.\n\n28% do mês: pró-labore em 28% do faturamento.\nSem folga: o mínimo que mantém o Fator R em 28% no mês seguinte.\nManual: um valor fixo que você define.',
    where: 'No holerite de pró-labore feito pela contabilidade, ou no valor que você combinou com ela.',
  },
  rbt12: {
    title: 'RBT12',
    body: 'A receita bruta dos 12 meses anteriores ao mês calculado. Ela define a faixa do Simples e, com ela, a alíquota. Com menos de 12 meses de empresa, usa a média dos meses × 12.',
    where: 'No recibo do PGDAS-D de cada mês, em "Receita bruta acumulada nos 12 meses anteriores (RBT12)".',
  },
  factorR: {
    title: 'Fator R',
    body: 'A folha dos últimos 12 meses (pró-labore e salários) dividida pela receita do mesmo período. Com 28% ou mais, a empresa paga pelo Anexo III, mais barato; abaixo, pelo Anexo V.',
    where: 'No recibo do PGDAS-D, na parte do Fator R (folha de salários dos 12 meses anteriores).',
  },
  competence: {
    title: 'Competência',
    body: 'O mês a que o faturamento se refere: o mês em que as notas foram emitidas, e não o mês em que o dinheiro entrou.',
  },
  payroll: {
    title: 'Folha / pró-labore',
    body: 'O pró-labore bruto pago no mês (e salários de funcionários, se houver). É a "folha" que entra no Fator R.',
    where: 'No holerite de pró-labore do mês ou na DCTFWeb enviada pela contabilidade.',
  },
  monthTaxes: {
    title: 'INSS, IRRF e DAS do mês',
    body: 'Calculados pelo app a partir da receita e da folha. Se você souber os valores pagos, corrija para bater com as guias.',
    where: 'No e-CAC → Pagamentos e Parcelamentos → Consulta Comprovante de Pagamento:\n• código 3333 é o DAS do Simples;\n• código 1410 é o DARF da DCTFWeb, com INSS e IRRF juntos.',
  },
  companyName: {
    title: 'Razão social',
    body: 'O nome oficial da empresa. Aparece no topo do app e no Resumo do mês.',
    where: 'No Comprovante de Inscrição (cartão CNPJ), no site da Receita Federal.',
  },
  cnpj: {
    title: 'CNPJ',
    body: 'O número de cadastro da empresa. Aparece no Resumo do mês, para guardar ou mandar à contabilidade.',
    where: 'No cartão CNPJ ou em qualquer nota fiscal emitida pela empresa.',
  },
  cityState: {
    title: 'Cidade / UF',
    body: 'Onde a empresa está registrada. O ISS do Simples vai para essa cidade.',
    where: 'No cartão CNPJ, em "Município" e "UF".',
  },
  cnae: {
    title: 'CNAE principal',
    body: 'O código da atividade da empresa. Ele define o anexo do Simples: atividades como desenvolvimento de software, consultoria e engenharia ficam no Anexo V, mas podem ir para o Anexo III com o Fator R de 28%.',
    where: 'No cartão CNPJ, em "Código e descrição da atividade econômica principal".',
  },
  accountingFee: {
    title: 'Honorários da contabilidade',
    body: 'Quanto você paga por mês à contabilidade. O app deixa esse valor na conta da empresa, junto com os impostos, e desconta da antecipação de lucros.',
    where: 'No contrato ou no boleto mensal da contabilidade.',
  },
} satisfies Record<string, HelpContent>;
