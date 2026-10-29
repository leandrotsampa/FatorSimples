// Linhas de PDFs como o pdf.js as entrega (pedaços da mesma linha separados por "|"), com dados
// fictícios no mesmo formato dos documentos reais

export const PGDAS_LINES = `Programa Gerador do Documento de Arrecadação
do Simples Nacional - Declaratório
Declaração | Original
Período | de | Apuração: | 01/09/2026 a 30/09/2026
1. Identificação do Contribuinte
CNPJ | Matriz: | 11.222.333/0001-81
Nome | empresarial: | EMPRESA | EXEMPLO DE SISTEMAS LTDA
Data | de | abertura | no | CNPJ: | 04/10/2023
Optante | pelo | Simples | Nacional: | Sim
Regime | de | Apuração: | Competência
2.Apuração do Simples Nacional
2.1 | Discriminativo | de | Receitas
Total | de | Receitas | Brutas | (R$) | Mercado | Interno | Mercado | Externo | Total
Receita Bruta do | PA | (RPA) | - | Competência | 20.000,00 | 500,00 | 20.500,00
Receita bruta acumulada | nos | doze | meses | anteriores
243.000,00 | 1.000,00 | 244.000,00
ao PA (RBT12)
Receita bruta acumulada | nos | doze | meses | anteriores
ao PA proporcionalizada | (RBT12p)
Receita bruta acumulada | no | ano-calendário | corrente
180.000,00 | 0,00 | 180.000,00
(RBA)
Limite de receita | bruta | proporcionalizado | 4.800.000,00 | 4.800.000,00
2.2) | Receitas | Brutas | Anteriores | (R$)
2.2.1) Mercado Interno
01/2025 | 21.000,00 02/2025 | 20.000,00 03/2025 | 20.000,00 04/2025 | 19.000,00
05/2025 | 20.000,00 06/2025 | 21.000,00 07/2025 | 18.000,00 08/2025 | 18.000,00
09/2025 | 18.000,00 10/2025 | 21.000,00 11/2025 | 18.000,00 12/2025 | 20.000,00
01/2026 | 19.000,00 02/2026 | 19.000,00 03/2026 | 20.000,00 04/2026 | 19.000,00
05/2026 | 19.000,00 06/2026 | 19.000,00 07/2026 | 19.000,00 08/2026 | 32.000,00
2.2.2) Mercado Externo
01/2025 | 0,00 02/2025 | 0,00 03/2025 | 0,00 04/2025 | 0,00
05/2025 | 0,00 06/2025 | 0,00 07/2025 | 0,00 08/2025 | 0,00
09/2025 | 0,00 10/2025 | 0,00 11/2025 | 0,00 12/2025 | 0,00
01/2026 | 0,00 02/2026 | 0,00 03/2026 | 0,00 04/2026 | 0,00
05/2026 | 0,00 06/2026 | 0,00 07/2026 | 0,00 08/2026 | 1.000,00
2.3) | Folha | de | Salários | Anteriores | (R$)
09/2025 | 5.100,00 10/2025 | 6.000,00 11/2025 | 5.100,00 12/2025 | 5.600,00
01/2026 | 5.300,00 02/2026 | 5.300,00 03/2026 | 5.500,00 04/2026 | 5.300,00
05/2026 | 5.300,00 06/2026 | 5.300,00 07/2026 | 5.300,00 08/2026 | 9.000,00
2.3.1) | Total | de | Folhas | de | Salários | Anteriores (R$) | R$ 68.100,00
2.4) | Fator | r
Fator | r | = | 0,28 - | Anexo | III
Número | da | Declaração: | 11222333202609001 | Número do Recibo: 01.07.00000.0000000-1
2.6) | Resumo | da Declaração
Receita | Bruta Auferida | (regime | competência) | Valor Total do Débito Declarado (R$)
20.500,00 | 1.500,00
2.7) | Informações | da | Declaração | por | Estabelecimento
CNPJ | Estabelecimento: | 11.222.333/0001-81
Município: | SÃO JOSÉ DOS PINHAIS | UF: PR
IRPJ | CSLL | COFINS | PIS/Pasep | INSS/CPP | ICMS | IPI | ISS | Total
60,00 | 52,50 | 210,75 | 45,75 | 651,00 | 0,00 | 0,00 | 480,00 | 1.500,00
3. Informações da Recepção da Declaração
Data | e | horário da | transmissão | da | Declaração: | 15/10/2026 10:21:18`.split('\n');

export const PAYMENTS_LINES = `Parâmetros informados
Contribuinte: 11.222.333/0001-81 | Data de arrecadação: - | a 29/10/2026 | Tipo do documento: Todos
Emissão em 29/10/2026 02:45
Observação: a relação abaixo não serve como comprovante de arrecadação.
Pagamentos Selecionados
Data de Arrecadação | Receita | N° Documento | Período de Apuração | Principal (R$) | Multa (R$) | Juros (R$) | Total (R$)
15/10/2026 | 1410 | 07162628800000001 | 30/09/2026 | 700,00 | 0,00 | 0,00 | 700,00
15/10/2026 | 3333 | 07202628800000002 | 01/09/2026 | 1.500,00 | 0,00 | 0,00 | 1.500,00
14/09/2026 | 1410 | 07162625700000003 | 31/08/2026 | 2.250,00 | 0,00 | 0,00 | 2.250,00
14/09/2026 | 3333 | 07202625600000004 | 01/08/2026 | 2.300,00 | 12,50 | 3,40 | 2.315,90
Página 1
Data de Arrecadação | Receita | N° Documento | Período de Apuração | Principal (R$) | Multa (R$) | Juros (R$) | Total (R$)
14/08/2026 | 3333 | 07202622500000005 | 01/07/2026 | 1.340,00 | 0,00 | 0,00 | 1.340,00
20/08/2026 | 3333 | 07202622500000006 | 01/07/2026 | 10,00 | 0,00 | 0,00 | 10,00
17/11/2023 | 1410 | 07162330400000007 | 01/10/2023 | 145,20 | 0,00 | 0,00 | 145,20
Página 2`.split('\n');
