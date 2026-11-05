// Site do FatorSimples. Sem este arquivo, tudo continua funcionando: os links de download
// levam à página da última versão no GitHub e os números do simulador ficam no exemplo.
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var REPO = 'leandrotsampa/FatorSimples';

  // ---------- Tabelas do Simples (LC 123/2006, Anexos III e V), as mesmas do app ----------
  var ANEXO_III = [
    [180000, 0.06, 0], [360000, 0.112, 9360], [720000, 0.135, 17640],
    [1800000, 0.16, 35640], [3600000, 0.21, 125640], [4800000, 0.33, 648000]
  ];
  var ANEXO_V = [
    [180000, 0.155, 0], [360000, 0.18, 4500], [720000, 0.195, 9900],
    [1800000, 0.205, 17100], [3600000, 0.23, 62100], [4800000, 0.305, 540000]
  ];
  function aliquotaEfetiva(table, rbt12) {
    for (var i = 0; i < table.length; i++) {
      if (rbt12 <= table[i][0]) return i === 0 ? table[i][1] : (rbt12 * table[i][1] - table[i][2]) / rbt12;
    }
    return null;
  }

  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var pct = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var plain = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function setText(sel, text, root) { $$(sel, root).forEach(function (el) { el.textContent = text; }); }

  // ---------- Sistema de quem visita: só marca o cartão, não escolhe pela pessoa ----------
  function detectOS() {
    var ua = navigator.userAgent.toLowerCase();
    var p = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '').toLowerCase();
    if (/android|iphone|ipad|ipod/.test(ua) || (navigator.userAgentData && navigator.userAgentData.mobile)) return 'mobile';
    if (p.indexOf('win') === 0 || ua.indexOf('windows') !== -1) return 'windows';
    if (p.indexOf('mac') === 0 || ua.indexOf('mac os') !== -1) return 'mac';
    if (p.indexOf('linux') !== -1 || ua.indexOf('linux') !== -1) return 'linux';
    return 'other';
  }
  var os = detectOS();
  $$('.dl[data-os]').forEach(function (card) {
    if (card.getAttribute('data-os') !== os) return;
    card.classList.add('current');
    var badge = $('.badge', card);
    if (badge) badge.hidden = false;
  });

  // No celular o app não roda: a calculadora online vira a ação principal e o download
  // vira "mandar o link para o computador"
  if (os === 'mobile') {
    $$('[data-cta-row]').forEach(function (row) {
      var dl = $('[data-cta-download]', row);
      var calc = $('[data-cta-calc]', row);
      if (!dl || !calc) return;
      calc.className = 'btn btn-primary';
      dl.className = 'btn btn-ghost';
      row.insertBefore(calc, dl);
      var label = $('[data-cta-download-label]', dl);
      if (label) label.textContent = 'Enviar o link para o computador';
      dl.addEventListener('click', function (e) {
        var url = location.origin + location.pathname;
        var data = { title: 'FatorSimples', text: 'Baixar o FatorSimples no computador', url: url };
        if (navigator.share) {
          e.preventDefault();
          navigator.share(data).catch(function () {});
        } else {
          dl.href = 'mailto:?subject=' + encodeURIComponent('FatorSimples') + '&body=' + encodeURIComponent(data.text + ': ' + url);
        }
      });
    });
  }

  // ---------- Última versão: links, tamanhos e número da versão vêm sempre do GitHub ----------
  var ASSETS = {
    'win-setup': /setup\.exe$/i,
    'win-portable': /portable\.exe$/i,
    'mac-arm': /arm64\.dmg$/i,
    'mac-intel': /x64\.dmg$/i,
    'linux': /\.appimage$/i
  };
  function mb(bytes) { return (bytes / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' MB'; }

  if (window.fetch && $('[data-asset], [data-version], [data-version-long]')) {
    fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rel) {
        if (!rel) return;
        var version = String(rel.tag_name || '').replace(/^v/, '');
        if (version) setText('[data-version]', 'versão ' + version);
        if (version && rel.published_at) {
          var date = new Date(rel.published_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
          setText('[data-version-long]', 'Versão atual: ' + version + ', de ' + date + '.');
        }
        $$('[data-asset]').forEach(function (link) {
          var re = ASSETS[link.getAttribute('data-asset')];
          var asset = re && (rel.assets || []).filter(function (a) { return re.test(a.name); })[0];
          if (!asset) return;
          link.href = asset.browser_download_url;
          link.setAttribute('download', '');
          var size = $('[data-size]', link);
          if (size) size.textContent = mb(asset.size);
        });
      })
      .catch(function () { /* sem rede ou limite da API: os links da página de releases continuam valendo */ });
  }

  // ---------- Simulador do topo: economia de DAS com o Fator R ----------
  var sim = document.getElementById('sim');
  if (sim) {
    var range = $('#sim-fat', sim);
    var out = $('#sim-fat-out', sim);
    var renderSim = function () {
      var fat = Number(range.value);
      var rbt12 = fat * 12;
      var iii = aliquotaEfetiva(ANEXO_III, rbt12);
      var v = aliquotaEfetiva(ANEXO_V, rbt12);
      var dasIII = Math.round(fat * iii * 100) / 100;
      var dasV = Math.round(fat * v * 100) / 100;
      var mes = dasV - dasIII;
      out.textContent = brl.format(fat);
      range.style.setProperty('--fill', ((fat - range.min) / (range.max - range.min) * 100) + '%');
      setText('[data-sim="iii-aliq"]', pct.format(iii), sim);
      setText('[data-sim="v-aliq"]', pct.format(v), sim);
      setText('[data-sim="iii-das"]', brl.format(dasIII), sim);
      setText('[data-sim="v-das"]', brl.format(dasV), sim);
      setText('[data-sim="mes"]', brl.format(mes), sim);
      setText('[data-sim="ano"]', plain.format(mes * 12), sim);
      setText('[data-sim="pro"]', brl.format(Math.ceil(fat * 28) / 100), sim);
      range.setAttribute('aria-valuetext', brl.format(fat) + ' por mês, ' + brl.format(mes) + ' a menos de DAS');
    };
    range.addEventListener('input', renderSim);
    renderSim();
  }

  // ---------- Calculadora do Fator R e do pró-labore (página fator-r/) ----------
  // As tabelas fiscais (teto do INSS, IRRF e a redução da Lei 15.270/2025) vêm do mesmo
  // tax-tables/tabelas.json que o app usa. Sem acesso ao GitHub, valem as de 2026 abaixo.
  var TABLES_URL = 'https://raw.githubusercontent.com/' + REPO + '/main/tax-tables/tabelas.json';
  var FALLBACK_TABLE = {
    name: 'Vigente Oficial 2026 (Lei 15.191/2025 + redução da Lei 15.270/2025)',
    validFrom: '2026-01', year: 2026,
    inssCeiling: 8475.55, inssRate: 0.11, simplifiedIrDeduction: 607.2,
    irrfBrackets: [
      { limit: 2428.8, rate: 0, deduction: 0 }, { limit: 2826.65, rate: 0.075, deduction: 182.16 },
      { limit: 3751.05, rate: 0.15, deduction: 394.16 }, { limit: 4664.68, rate: 0.225, deduction: 675.49 },
      { limit: null, rate: 0.275, deduction: 908.73 }
    ],
    irrfReduction: { fullExemptionLimit: 5000, maxReduction: 312.89, phaseOutLimit: 7350, phaseOutBase: 978.62, phaseOutRate: 0.133145 },
    dividendWithholding: { monthlyThreshold: 50000, rate: 0.1 }
  };

  // Partilha do DAS entre IRPJ, CSLL, COFINS, PIS, CPP e ISS por faixa: cada tributo é arredondado
  // ao centavo e o DAS é a soma, como no PGDAS-D (mesma regra do app)
  var DAS_SHARES = {
    III: [[0.04, 0.035, 0.1282, 0.0278, 0.434, 0.335], [0.04, 0.035, 0.1405, 0.0305, 0.434, 0.32],
      [0.04, 0.035, 0.1364, 0.0296, 0.434, 0.325], [0.04, 0.035, 0.1364, 0.0296, 0.434, 0.325],
      [0.04, 0.035, 0.1282, 0.0278, 0.434, 0.335], [0.35, 0.15, 0.1603, 0.0347, 0.305, 0]],
    V: [[0.25, 0.15, 0.141, 0.0305, 0.2885, 0.14], [0.23, 0.15, 0.141, 0.0305, 0.2785, 0.17],
      [0.24, 0.15, 0.1492, 0.0323, 0.2385, 0.19], [0.21, 0.15, 0.1574, 0.0341, 0.2385, 0.21],
      [0.23, 0.125, 0.141, 0.0305, 0.2385, 0.235], [0.35, 0.155, 0.1644, 0.0356, 0.295, 0]]
  };
  var cents = function (v) { return Math.round(v * 100 + 1e-6) / 100; };

  function faixaDe(rbt12) {
    for (var i = 0; i < ANEXO_III.length; i++) if (rbt12 <= ANEXO_III[i][0]) return i + 1;
    return null;
  }
  function das(receita, rbt12, anexo) {
    var faixa = faixaDe(rbt12);
    var aliq = aliquotaEfetiva(anexo === 'III' ? ANEXO_III : ANEXO_V, rbt12);
    var total = receita * aliq;
    var valor = cents(DAS_SHARES[anexo][faixa - 1].reduce(function (s, share) { return s + cents(total * share); }, 0));
    return { valor: valor, aliquota: aliq, faixa: faixa };
  }

  // INSS de 11% até o teto; IRRF pelo menor entre deduções legais e desconto simplificado,
  // depois a redução da Lei 15.270/2025 sobre o rendimento bruto (mesma regra do app)
  function prolabore(bruto, t) {
    var inss = Math.min(bruto, t.inssCeiling) * t.inssRate;
    var irDe = function (base) {
      for (var i = 0; i < t.irrfBrackets.length; i++) {
        var b = t.irrfBrackets[i];
        if (b.limit === null || b.limit === undefined || base <= b.limit) return Math.max(0, base * b.rate - b.deduction);
      }
      return 0;
    };
    var legal = irDe(Math.max(0, bruto - inss));
    var simples = irDe(Math.max(0, bruto - t.simplifiedIrDeduction));
    var metodo = simples < legal ? 'desconto simplificado' : 'deduções legais';
    var antes = Math.min(legal, simples);
    var reducao = 0;
    var red = t.irrfReduction;
    if (red) {
      reducao = bruto <= red.fullExemptionLimit ? red.maxReduction
        : bruto <= red.phaseOutLimit ? Math.max(0, red.phaseOutBase - red.phaseOutRate * bruto) : 0;
      reducao = Math.min(reducao, antes);
    }
    inss = cents(inss);
    var ir = cents(antes - reducao);
    return {
      inss: inss, irrf: ir, liquido: cents(bruto - inss - ir), metodo: metodo,
      reducao: cents(reducao), tetoInss: bruto >= t.inssCeiling
    };
  }

  // Tabela da competência atual: a mais recente que já começou e ainda não terminou
  function tabelaDoMes(tables) {
    var now = new Date();
    var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var validas = (tables || []).filter(function (t) {
      return t && t.validFrom <= ym && (!t.validTo || t.validTo >= ym) && t.irrfBrackets && t.inssCeiling;
    });
    validas.sort(function (a, b) { return a.validFrom < b.validFrom ? 1 : -1; });
    return validas[0] || null;
  }

  function parseBRL(s) {
    s = String(s || '').replace(/[^\d,.-]/g, '');
    if (s.indexOf(',') !== -1) s = s.replace(/\./g, '').replace(',', '.');
    else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, '');
    var n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var form = document.getElementById('calc');
  if (form) {
    var fat = $('#fat', form);
    var pro = $('#pro', form);
    var rbtIn = $('#rbt', form);
    var folhaIn = $('#folha', form);
    var r = function (name) { return $('[data-r="' + name + '"]', form); };
    var tabela = FALLBACK_TABLE;
    var origemTabela = 'tabelas embutidas no site';

    // Um cenário completo do mês: DAS da empresa, impostos do pró-labore e o que vai para o sócio
    var cenario = function (receita, rbt12, folha12, pl) {
      var fator = rbt12 > 0 ? folha12 / rbt12 : 0;
      var anexo = fator >= 0.28 ? 'III' : 'V';
      var d = das(receita, rbt12, anexo);
      var p = prolabore(pl, tabela);
      var lucrosBrutos = Math.max(0, cents(receita - d.valor - pl));
      var ret = tabela.dividendWithholding;
      var irLucros = ret && lucrosBrutos > ret.monthlyThreshold ? cents(lucrosBrutos * ret.rate) : 0;
      var lucros = cents(lucrosBrutos - irLucros);
      var impostos = cents(d.valor + p.inss + p.irrf + irLucros);
      return {
        fator: fator, anexo: anexo, das: d, pl: pl, p: p, lucros: lucros, irLucros: irLucros,
        impostos: impostos, paraVoce: cents(p.liquido + lucros), carga: receita > 0 ? impostos / receita : 0
      };
    };

    var update = function () {
      var f = parseBRL(fat.value);
      var pl = parseBRL(pro.value);
      var minimo = Math.ceil(f * 28) / 100;
      var usar = r('usar28');
      usar.textContent = f ? 'Usar 28% do faturamento (' + brl.format(minimo) + ')' : 'Usar 28% do faturamento';
      var box = r('fator-box');
      var vazio = function (msg) {
        r('fator').textContent = '—'; r('fator-sub').textContent = msg;
        r('aliquota').textContent = '—'; r('aliquota-sub').textContent = '';
        r('liquido').textContent = '—'; r('liquido-sub').textContent = '';
        box.className = 'result';
        r('previsao').hidden = true;
      };
      if (!f) return vazio('Informe o faturamento do mês');

      var temRbt = parseBRL(rbtIn.value) > 0;
      var temFolha = parseBRL(folhaIn.value) > 0;
      var rbt12 = temRbt ? parseBRL(rbtIn.value) : f * 12;
      if (rbt12 > 4800000) return vazio('Receita de 12 meses acima do limite do Simples (R$ 4,8 milhões)');

      // Sem histórico, a conta supõe 12 meses iguais a este (o pró-labore define o Fator R).
      // Com a folha dos 12 meses, o anexo deste mês já está decidido: o pró-labore muda só os próximos.
      var a = cenario(f, rbt12, temFolha ? parseBRL(folhaIn.value) : pl * 12, pl);
      var igual = Math.abs(pl - minimo) < 0.005;
      var b = igual ? null : cenario(f, rbt12, temFolha ? parseBRL(folhaIn.value) : minimo * 12, minimo);

      r('fator').textContent = pct.format(a.fator);
      box.className = 'result ' + (a.anexo === 'III' ? 'ok' : 'bad');
      r('fator-sub').textContent = 'Anexo ' + a.anexo + (temFolha ? ', pelo histórico' : a.anexo === 'III' ? '' : ' · faltam ' + brl.format(minimo - pl) + ' de pró-labore');
      r('aliquota').textContent = pct.format(a.das.aliquota);
      r('aliquota-sub').textContent = 'DAS de ' + brl.format(a.das.valor) + ' · faixa ' + a.das.faixa;
      r('liquido').textContent = brl.format(a.p.liquido);
      r('liquido-sub').textContent = 'INSS ' + brl.format(a.p.inss) + ' · IRRF ' + brl.format(a.p.irrf);

      // Tabela agrupada: pró-labore, empresa e resumo, lado a lado com o pró-labore em 28%
      var tabelaEl = r('tabela-detalhe');
      tabelaEl.classList.toggle('one-col', igual);
      r('col-a').textContent = igual ? 'Pró-labore em 28%' : 'Seu pró-labore';
      var linha = function (rotulo, va, vb, cls, nota) {
        var cel = function (v) { return '<td>' + v + '</td>'; };
        return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><th scope="row">' + rotulo + (nota ? '<small>' + nota + '</small>' : '') + '</th>'
          + cel(va) + (b ? cel(vb) : '') + '</tr>';
      };
      var grupo = function (titulo) { return '<tr class="group"><th scope="rowgroup" colspan="' + (b ? 3 : 2) + '">' + titulo + '</th></tr>'; };
      var m = function (v) { return brl.format(v); };
      var neg = function (v) { return v ? '− ' + brl.format(v) : brl.format(0); };
      var sub = function (v, txt) { return v + '<small>' + esc(txt) + '</small>'; };
      var bb = b || a;
      var irNota = function (c) {
        return c.p.irrf === 0 && c.p.reducao > 0 ? 'isento pela redução da Lei 15.270'
          : c.p.reducao > 0 ? c.p.metodo + ' · redução de ' + brl.format(c.p.reducao) : c.p.metodo;
      };

      r('grupo-pl').innerHTML = grupo('Pró-labore')
        + linha('Pró-labore bruto', m(a.pl), m(bb.pl))
        + linha('INSS', sub(neg(a.p.inss), a.p.tetoInss ? 'no teto' : '11%'), sub(neg(bb.p.inss), bb.p.tetoInss ? 'no teto' : '11%'), '', '11% até o teto de ' + brl.format(tabela.inssCeiling))
        + linha('IRRF', sub(neg(a.p.irrf), irNota(a)), sub(neg(bb.p.irrf), irNota(bb)))
        + linha('Pró-labore líquido', m(a.p.liquido), m(bb.p.liquido), 'sum');

      r('grupo-empresa').innerHTML = grupo('Empresa')
        + linha('Faturamento do mês', m(f), m(f))
        + linha('DAS', sub(neg(a.das.valor), 'Anexo ' + a.anexo + ' · ' + pct.format(a.das.aliquota)), sub(neg(bb.das.valor), 'Anexo ' + bb.anexo + ' · ' + pct.format(bb.das.aliquota)), '', 'RBT12 de ' + brl.format(rbt12) + ', faixa ' + a.das.faixa)
        + linha('Pró-labore bruto', neg(a.pl), neg(bb.pl))
        + (a.irLucros || bb.irLucros ? linha('IR retido sobre lucros', neg(a.irLucros), neg(bb.irLucros), '', '10% acima de R$ 50 mil no mês') : '')
        + linha('Antecipação de lucros', m(a.lucros), m(bb.lucros), 'sum', a.irLucros || bb.irLucros ? '' : 'isenta de IR');

      var proximo = function (c) {
        // Fator R do mês seguinte: o mês mais antigo sai e este entra (sem histórico, fica igual)
        if (!temFolha && !temRbt) return c.pl / f;
        var folha12 = temFolha ? parseBRL(folhaIn.value) : c.pl * 12;
        return (folha12 * 11 / 12 + c.pl) / (rbt12 * 11 / 12 + f);
      };
      var proxTxt = function (c) { var x = proximo(c); return sub(pct.format(x), 'Anexo ' + (x >= 0.28 ? 'III' : 'V')); };
      r('grupo-resumo').innerHTML = grupo('Resumo')
        + linha('Impostos do mês', sub(m(a.impostos), pct.format(a.carga) + ' do faturamento'), sub(m(bb.impostos), pct.format(bb.carga) + ' do faturamento'), 'sum', 'DAS + INSS + IRRF')
        + linha('Fator R do mês seguinte', proxTxt(a), proxTxt(bb), '', temFolha || temRbt ? 'aproximado pelo histórico' : '')
        + linha('Para você no mês', m(a.paraVoce), m(bb.paraVoce), 'sum total', 'pró-labore líquido + lucros');

      var veredito = r('veredito');
      // Com o histórico preenchido, o anexo deste mês já está decidido: o que dá para mudar é o próximo
      var folha12 = temFolha ? parseBRL(folhaIn.value) : 0;
      var precisa = temFolha ? Math.ceil((0.28 * (rbt12 * 11 / 12 + f) - folha12 * 11 / 12) * 100) / 100 : 0;
      if (temFolha && a.anexo === 'V') {
        veredito.textContent = 'Pelo histórico, este mês já fica no Anexo V. Para voltar ao Anexo III no mês seguinte, o pró-labore deste mês precisa ser de pelo menos '
          + brl.format(Math.max(0, precisa)) + ' (aproximado).';
      } else if (temFolha && proximo(a) < 0.28) {
        veredito.textContent = 'Este mês está no Anexo III, mas com esse pró-labore o próximo cai para o Anexo V. Para manter, use pelo menos '
          + brl.format(Math.max(0, precisa)) + ' (aproximado).';
      } else if (!b) {
        veredito.textContent = 'Pró-labore em 28% do faturamento: o ponto certo para manter o Anexo III.';
      } else {
        var dif = cents(b.paraVoce - a.paraVoce);
        veredito.textContent = dif > 0
          ? 'Com o pró-labore em 28%, sobram ' + brl.format(dif) + ' a mais para você neste mês.'
          : dif < 0
            ? 'Com o pró-labore em 28% (' + brl.format(minimo) + '), sobram ' + brl.format(-dif) + ' a mais para você neste mês.'
            : 'Neste mês, o pró-labore em 28% deixa o mesmo valor para você.';
      }
      veredito.className = 'forecast-verdict ' + (temFolha && (a.anexo === 'V' || proximo(a) < 0.28) ? 'warn' : 'ok');
      r('tabela').textContent = 'INSS e IRRF pela tabela "' + tabela.name + '" (' + origemTabela + ').';
      r('previsao').hidden = false;
    };

    r('usar28').addEventListener('click', function () {
      var f = parseBRL(fat.value);
      if (!f) { fat.focus(); return; }
      pro.value = plain.format(Math.ceil(f * 28) / 100);
      update();
    });
    [fat, pro, rbtIn, folhaIn].forEach(function (el) {
      el.addEventListener('input', update);
      el.addEventListener('blur', function () { var n = parseBRL(el.value); el.value = n ? plain.format(n) : ''; });
    });
    update();

    // Tabelas publicadas no GitHub: substituem as embutidas assim que chegam
    if (window.fetch) {
      fetch(TABLES_URL, { cache: 'no-cache' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (json) {
          var t = json && tabelaDoMes(json.tables);
          if (!t) return;
          tabela = t;
          var pub = json.publishedAt ? new Date(json.publishedAt + 'T12:00:00').toLocaleDateString('pt-BR') : '';
          origemTabela = 'publicada no GitHub' + (pub ? ' em ' + pub : '');
          update();
        })
        .catch(function () { /* sem rede: continuam as tabelas embutidas */ });
    }
  }

  // ---------- Entrada suave das seções ----------
  var items = $$('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }
})();
