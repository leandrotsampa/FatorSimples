// Site do FatorSimples. Sem este arquivo, tudo continua funcionando: os links de download
// levam à página da última versão no GitHub e os números do simulador ficam no exemplo.
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var REPO = 'leandrotsampa/FatorSimples';

  // ---------- Tema: segue o sistema; a troca no botão fica salva neste navegador ----------
  var root = document.documentElement;
  var sistemaEscuro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function temaAtual() {
    var t = root.getAttribute('data-theme');
    return t || (sistemaEscuro && sistemaEscuro.matches ? 'dark' : 'light');
  }
  // As capturas com versão escura (<picture>) acompanham a escolha, não só o sistema
  function sincronizarCapturas() {
    var escolhido = root.getAttribute('data-theme');
    Array.prototype.forEach.call(document.querySelectorAll('picture source[media*="prefers-color-scheme"], picture source[data-media-tema]'), function (s) {
      if (!s.hasAttribute('data-media-tema')) s.setAttribute('data-media-tema', s.getAttribute('media'));
      s.setAttribute('media', escolhido === 'dark' ? 'all' : escolhido === 'light' ? 'not all' : s.getAttribute('data-media-tema'));
    });
  }
  function rotularBotoes() {
    var proximo = temaAtual() === 'dark' ? 'claro' : 'escuro';
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-toggle]'), function (b) {
      b.setAttribute('aria-label', 'Usar o tema ' + proximo);
      b.setAttribute('title', 'Usar o tema ' + proximo);
    });
  }
  sincronizarCapturas();
  rotularBotoes();
  if (sistemaEscuro && sistemaEscuro.addEventListener) sistemaEscuro.addEventListener('change', rotularBotoes);
  Array.prototype.forEach.call(document.querySelectorAll('[data-theme-toggle]'), function (b) {
    b.addEventListener('click', function () {
      var novo = temaAtual() === 'dark' ? 'light' : 'dark';
      var animar = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (animar) root.classList.add('theme-anim');
      root.setAttribute('data-theme', novo);
      try { localStorage.setItem('fs-tema', novo); } catch (e) { /* navegação privada: vale só nesta página */ }
      sincronizarCapturas();
      rotularBotoes();
      if (animar) setTimeout(function () { root.classList.remove('theme-anim'); }, 350);
    });
  });

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
    validFrom: '2026-01', year: 2026, minimumWage: 1621,
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

    // Um cenário completo do mês: DAS da empresa, impostos do pró-labore, o que vai para o sócio
    // e a alíquota do mês seguinte (o mês mais antigo sai do histórico e este entra)
    var cenario = function (o) {
      var fator = o.rbt12 > 0 ? o.folha12 / o.rbt12 : 0;
      var anexo = o.semFatorR ? 'V' : fator >= 0.28 ? 'III' : 'V';
      var d = das(o.receita, o.rbt12, anexo);
      var p = prolabore(o.pl, tabela);
      var lucrosBrutos = Math.max(0, cents(o.receita - d.valor - o.pl));
      var ret = tabela.dividendWithholding;
      var irLucros = ret && lucrosBrutos > ret.monthlyThreshold ? cents(lucrosBrutos * ret.rate) : 0;
      var lucros = cents(lucrosBrutos - irLucros);
      var impostos = cents(d.valor + p.inss + p.irrf + irLucros);
      var proxFator = o.historico
        ? (o.folha12 * 11 / 12 + o.pl) / (o.rbt12 * 11 / 12 + o.receita)
        : o.pl / o.receita;
      var proxRbt = o.historico ? o.rbt12 * 11 / 12 + o.receita : o.rbt12;
      var proxAnexo = o.semFatorR ? 'V' : proxFator >= 0.28 ? 'III' : 'V';
      return {
        rotulo: o.rotulo, fator: fator, anexo: anexo, das: d, pl: o.pl, p: p, lucros: lucros, irLucros: irLucros,
        impostos: impostos, paraVoce: cents(p.liquido + lucros), carga: o.receita > 0 ? impostos / o.receita : 0,
        semFatorR: !!o.semFatorR, proxFator: proxFator, proxAnexo: proxAnexo,
        proxAliquota: proxRbt <= 4800000 ? aliquotaEfetiva(proxAnexo === 'III' ? ANEXO_III : ANEXO_V, proxRbt) : null
      };
    };

    var abrirHistorico = function (e) {
      if (e) e.preventDefault();
      var det = r('historico');
      det.open = true;
      rbtIn.focus();
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
      var historico = temRbt || temFolha;
      var rbt12 = temRbt ? parseBRL(rbtIn.value) : f * 12;
      if (rbt12 > 4800000) return vazio('Receita de 12 meses acima do limite do Simples (R$ 4,8 milhões)');
      // Sem a folha dos 12 meses, supõe 12 meses com este pró-labore; com ela, o anexo deste mês já está decidido
      var folha12 = function (valor) { return temFolha ? parseBRL(folhaIn.value) : valor * 12; };
      var base = { receita: f, rbt12: rbt12, historico: historico };
      var com = function (extra) { var o = {}; for (var k in base) o[k] = base[k]; for (var j in extra) o[j] = extra[j]; return o; };

      var igual = Math.abs(pl - minimo) < 0.005;
      var salarioMinimo = tabela.minimumWage || 1621;
      var a = cenario(com({ pl: pl, folha12: folha12(pl), rotulo: igual ? 'Seu pró-labore (28%)' : 'Seu pró-labore' }));
      var b = igual
        ? cenario(com({ pl: salarioMinimo, folha12: salarioMinimo * 12, semFatorR: true, rotulo: 'Sem Fator R' }))
        : cenario(com({ pl: minimo, folha12: folha12(minimo), rotulo: 'Pró-labore em 28%' }));

      r('fator').textContent = pct.format(a.fator);
      box.className = 'result ' + (a.anexo === 'III' ? 'ok' : 'bad');
      r('fator-sub').textContent = 'Anexo ' + a.anexo + (temFolha ? ', pelo histórico' : a.anexo === 'III' ? '' : ' · faltam ' + brl.format(minimo - pl) + ' de pró-labore');
      // Mesmo marcador ≈ dos cartões: sem o RBT12, a alíquota e o DAS são estimados
      var marca = historico ? '' : '<span class="aprox" title="Estimado: depende do RBT12">≈</span> ';
      r('aliquota').innerHTML = marca + pct.format(a.das.aliquota);
      r('aliquota-sub').innerHTML = 'DAS de ' + marca + brl.format(a.das.valor) + ' · faixa ' + a.das.faixa;
      r('liquido').textContent = brl.format(a.p.liquido);
      r('liquido-sub').textContent = 'INSS ' + brl.format(a.p.inss) + ' · IRRF ' + brl.format(a.p.irrf);

      // Selo: deixa claro quando os números são estimativa
      r('selo').className = 'selo ' + (historico ? 'hist' : 'est');
      r('selo').innerHTML = historico
        ? '<b>Com o seu histórico</b><span>RBT12 de ' + brl.format(rbt12) + (temFolha ? ' e folha de ' + brl.format(parseBRL(folhaIn.value)) : '') + ' nos 12 meses anteriores.</span><a href="#rbt" data-r="abrir-historico">Editar</a>'
        : '<b>Estimativa</b><span>Sem o RBT12, a conta supõe 12 meses iguais a este. Os valores com ≈ dependem dele e podem mudar com o seu histórico real.</span><a href="#rbt" data-r="abrir-historico">Preencher o histórico</a>';
      r('abrir-historico').addEventListener('click', abrirHistorico);

      // Mensagem principal e qual cenário leva o destaque de "melhor"
      var dif = cents(b.paraVoce - a.paraVoce);
      var msg, nota = '', aviso = false;
      if (temFolha && a.anexo === 'V') {
        aviso = true;
        var precisa = Math.max(0, Math.ceil((0.28 * (rbt12 * 11 / 12 + f) - parseBRL(folhaIn.value) * 11 / 12) * 100) / 100);
        msg = 'Pelo histórico, este mês já fica no Anexo V.';
        nota = 'Para voltar ao Anexo III no mês seguinte, o pró-labore deste mês precisa ser de pelo menos ' + brl.format(precisa) + ' (aproximado).';
      } else if (temFolha && a.proxAnexo === 'V' && !igual && pl < minimo) {
        aviso = true;
        var custo = cents(das(f, rbt12, 'V').valor - das(f, rbt12, 'III').valor);
        msg = 'Neste mês, ' + brl.format(pl) + ' deixa ' + brl.format(Math.abs(dif)) + ' a mais para você, porque o DAS já está no Anexo III pelo histórico. Mas o Fator R do mês seguinte cai para ' + pct.format(a.proxFator) + ' (Anexo V).';
        nota = 'No Anexo V, o DAS do mês seguinte fica cerca de ' + brl.format(custo) + ' mais caro, com o mesmo faturamento. Com o pró-labore em 28%, o Anexo III continua.';
      } else if (igual) {
        msg = 'O Fator R deixa ' + brl.format(Math.abs(dif)) + ' a mais para você neste mês.';
        nota = 'Comparado a não usar o Fator R: pró-labore de 1 salário mínimo (' + brl.format(salarioMinimo) + ') e DAS pelo Anexo V.';
      } else if (pl > minimo) {
        // Folga: até quanto dá para faturar no mês sem o Fator R ficar abaixo de 28%
        var limite = temFolha
          ? (parseBRL(folhaIn.value) * 11 / 12 + pl) / 0.28 - rbt12 * 11 / 12
          : pl / 0.28;
        msg = 'Seu pró-labore está ' + brl.format(cents(pl - minimo)) + ' acima dos 28%. Baixando para ' + brl.format(minimo) + ', sobram ' + brl.format(Math.abs(dif)) + ' a mais para você neste mês.';
        nota = 'A folga tem valor: com ' + brl.format(pl) + ', dá para faturar até ' + brl.format(cents(limite)) + ' neste mês sem o Fator R cair abaixo de 28%.';
      } else {
        msg = 'Com o pró-labore em 28%, sobram ' + brl.format(Math.abs(dif)) + ' a mais para você neste mês.';
      }
      var melhor = aviso ? null : b.paraVoce > a.paraVoce ? b : a;
      var veredito = r('veredito');
      veredito.className = 'forecast-verdict ' + (aviso ? 'warn' : 'ok');
      veredito.innerHTML = esc(msg) + (nota ? '<small>' + esc(nota) + '</small>' : '');

      // Dois cartões: o cenário informado e o de comparação
      var irNota = function (c) {
        return c.p.irrf === 0 && c.p.reducao > 0 ? 'isento pela redução da Lei 15.270'
          : c.p.reducao > 0 ? c.p.metodo + ', redução de ' + brl.format(c.p.reducao) : c.p.metodo;
      };
      // Sem o RBT12 informado, o DAS e tudo que depende dele leva o marcador ≈ (explicado no selo)
      var aprox = function (v) { return historico ? v : '<span class="aprox" title="Estimado: depende do RBT12">≈</span> ' + v; };
      var item = function (rotulo, valor, nota2, cls) {
        return '<dt' + (cls ? ' class="' + cls + '"' : '') + '>' + rotulo + '</dt><dd' + (cls ? ' class="' + cls + '"' : '') + '>' + valor + (nota2 ? '<small>' + esc(nota2) + '</small>' : '') + '</dd>';
      };
      var menos = function (v) { return v ? '− ' + brl.format(v) : brl.format(0); };
      var cartao = function (c) {
        var vence = c === melhor;
        var etiqueta = 'Anexo ' + c.anexo + (vence ? ' · +' + brl.format(Math.abs(dif)) : '');
        var prox = c.proxAliquota === null ? '—' : pct.format(c.proxAliquota);
        var proxNota = c.semFatorR ? 'Anexo V, sem Fator R' : 'Anexo ' + c.proxAnexo + ' · Fator R de ' + pct.format(c.proxFator);
        return '<article class="sc' + (vence ? ' best' : '') + '">'
          + '<div class="sc-head"><h3>' + esc(c.rotulo) + ' · ' + brl.format(c.pl) + '</h3><span class="sc-badge ' + (c.anexo === 'III' ? 'iii' : 'v') + '">' + esc(etiqueta) + '</span></div>'
          + '<div class="sc-total"><small>Para você no mês</small><b>' + aprox(brl.format(c.paraVoce)) + '</b></div>'
          + '<dl>'
          + '<dt class="grp">Pró-labore</dt>'
          + item('Bruto', brl.format(c.pl))
          + item('INSS', menos(c.p.inss), c.p.tetoInss ? 'no teto de ' + brl.format(tabela.inssCeiling) : '11%')
          + item('IRRF', menos(c.p.irrf), irNota(c))
          + item('Líquido', brl.format(c.p.liquido), '', 'sum')
          + '<dt class="grp">Empresa</dt>'
          + item('DAS · ' + pct.format(c.das.aliquota), aprox(menos(c.das.valor)), 'Anexo ' + c.anexo + ', faixa ' + c.das.faixa + (historico ? '' : ' · RBT12 estimado em ' + brl.format(rbt12)))
          + (c.irLucros ? item('IR retido sobre lucros', menos(c.irLucros), '10% acima de R$ 50 mil no mês') : '')
          + item('Antecipação de lucros', aprox(brl.format(c.lucros)), c.irLucros ? '' : 'isenta de IR', 'sum')
          + '<dt class="grp">Impostos e próximo mês</dt>'
          + item('DAS + INSS + IRRF', aprox(brl.format(c.impostos)), pct.format(c.carga) + ' do faturamento')
          + item('Alíquota no mês seguinte', aprox(prox), proxNota)
          + '</dl></article>';
      };
      r('cenarios').innerHTML = cartao(a) + cartao(b);
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
