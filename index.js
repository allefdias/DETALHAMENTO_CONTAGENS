// COLE AQUI A SUA URL DO GOOGLE APPS SCRIPT
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyV7x7PUB07V2Kym8uiNsV4pHEwx9wGtjnM14XY-EfWGOt36P_q46FzWv_FwWKe9N75/exec";
let todosRegistros = [];

/* ---------------- INITIALIZATION ---------------- */
document.addEventListener("DOMContentLoaded", () => {
    carregarDados();
});

/* ---------------- FETCH DATA ---------------- */
async function carregarDados() {
    const loading = document.getElementById("loading");
    const dashboard = document.getElementById("dashboard");

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            todosRegistros = data;
            popularDropdowns(data);
            setAtalhoData("este_mes"); // Inicia com os dados deste mês
        } else {
            alert("Erro ao ler os dados da planilha.");
        }
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        alert("Erro ao conectar com a planilha. Verifique a URL do Apps Script.");
    } finally {
        loading.style.display = "none";
        dashboard.style.display = "block";
    }
}

/* ---------------- POPULAR DROPDOWNS DE FILTRO ---------------- */
function popularDropdowns(registros) {
    const selectSetor = document.getElementById("filtroSetor");
    const selectFunc = document.getElementById("filtroFuncionario");

    const setores = [...new Set(registros.map(r => r.setor))].sort();
    const funcionarios = [...new Set(registros.map(r => r.funcionario))].filter(Boolean).sort();

    setores.forEach(setor => {
        const opt = document.createElement("option");
        opt.value = setor;
        opt.textContent = setor;
        selectSetor.appendChild(opt);
    });

    funcionarios.forEach(func => {
        const opt = document.createElement("option");
        opt.value = func;
        opt.textContent = func;
        selectFunc.appendChild(opt);
    });
}

/* ---------------- ATALHOS DE DATA ---------------- */
function setAtalhoData(tipo) {
    const hoje = new Date();
    const inputInicio = document.getElementById("dataInicio");
    const inputFim = document.getElementById("dataFim");

    inputFim.value = formatarDataInput(hoje);

    if (tipo === "este_mes") {
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        inputInicio.value = formatarDataInput(primeiroDiaMes);
    } else if (tipo === "30_dias") {
        const data30 = new Date();
        data30.setDate(hoje.getDate() - 30);
        inputInicio.value = formatarDataInput(data30);
    } else if (tipo === "60_dias") {
        const data60 = new Date();
        data60.setDate(hoje.getDate() - 60);
        inputInicio.value = formatarDataInput(data60);
    } else if (tipo === "todos") {
        inputInicio.value = "";
        inputFim.value = "";
    }

    aplicarFiltros();
}

/* ---------------- APLICAR FILTROS ---------------- */
function aplicarFiltros() {
    const dataInicioStr = document.getElementById("dataInicio").value;
    const dataFimStr = document.getElementById("dataFim").value;
    const setorSel = document.getElementById("filtroSetor").value;
    const funcSel = document.getElementById("filtroFuncionario").value;

    const dtInicio = dataInicioStr ? new Date(dataInicioStr + "T00:00:00") : null;
    const dtFim = dataFimStr ? new Date(dataFimStr + "T23:59:59") : null;

    const filtrados = todosRegistros.filter(reg => {
        const regDate = parseDataBR(reg.data);

        // Filtro Data
        if (dtInicio && regDate < dtInicio) return false;
        if (dtFim && regDate > dtFim) return false;

        // Filtro Setor
        if (setorSel && reg.setor !== setorSel) return false;

        // Filtro Funcionario
        if (funcSel && reg.funcionario !== funcSel) return false;

        return true;
    });

    atualizarDashboard(filtrados);
}

function limparFiltros() {
    document.getElementById("filtroSetor").value = "";
    document.getElementById("filtroFuncionario").value = "";
    setAtalhoData("todos");
}

/* ---------------- ATUALIZAR INTERFACE ---------------- */
function atualizarDashboard(dados) {
    // 1. Atualizar KPIs
    const totalExames = dados.reduce((acc, r) => acc + (r.qtdExames || 0), 0);
    const funcionariosUnicos = [...new Set(dados.map(r => r.funcionario))].filter(Boolean);
    const setoresUnicos = [...new Set(dados.map(r => r.setor))].filter(Boolean);
    const media = funcionariosUnicos.length > 0 ? (totalExames / funcionariosUnicos.length).toFixed(1) : 0;

    document.getElementById("kpiTotalExames").innerText = totalExames.toLocaleString("pt-BR");
    document.getElementById("kpiMediaProfissional").innerText = media;
    document.getElementById("kpiTotalSetores").innerText = setoresUnicos.length;
    document.getElementById("kpiTotalFuncionarios").innerText = funcionariosUnicos.length;

    // 2. Renderizar Resumo Mensal
    renderizarResumoMensal(dados);

    // 3. Renderizar Resumo por Setor
    renderizarResumoSetor(dados);

    // 4. Renderizar Tabela Detalhada
    renderizarTabelaDetalhada(dados);
}

/* ---------------- RENDERIZAR TABELAS ---------------- */
function renderizarResumoMensal(dados) {
    const container = document.getElementById("tabelaMensalContainer");
    const agrupado = {};

    dados.forEach(r => {
        const dateObj = parseDataBR(r.data);
        if (dateObj) {
            const mesAno = dateObj.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            const mesAnoFormatted = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
            agrupado[mesAnoFormatted] = (agrupado[mesAnoFormatted] || 0) + r.qtdExames;
        }
    });

    const chaves = Object.keys(agrupado);
    if (chaves.length === 0) {
        container.innerHTML = `<p class="sem-dados">Nenhum registro encontrado.</p>`;
        return;
    }

    let html = `<table><thead><tr><th>Mês / Ano</th><th class="text-right">Qtd Exames</th></tr></thead><tbody>`;
    chaves.forEach(m => {
        html += `<tr><td>${m}</td><td class="text-right"><strong>${agrupado[m].toLocaleString("pt-BR")}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderizarResumoSetor(dados) {
    const container = document.getElementById("tabelaSetoresContainer");
    const agrupado = {};

    dados.forEach(r => {
        agrupado[r.setor] = (agrupado[r.setor] || 0) + r.qtdExames;
    });

    const chaves = Object.keys(agrupado);
    if (chaves.length === 0) {
        container.innerHTML = `<p class="sem-dados">Nenhum registro encontrado.</p>`;
        return;
    }

    let html = `<table><thead><tr><th>Setor</th><th class="text-right">Qtd Exames</th></tr></thead><tbody>`;
    chaves.forEach(s => {
        html += `<tr><td>${s}</td><td class="text-right"><strong>${agrupado[s].toLocaleString("pt-BR")}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderizarTabelaDetalhada(dados) {
    const container = document.getElementById("tabelaDetalhadaContainer");

    if (dados.length === 0) {
        container.innerHTML = `<p class="sem-dados">Nenhum registro para exibir.</p>`;
        return;
    }

    let html = `
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Setor</th>
          <th>Funcionário / Profissional</th>
          <th class="text-right">Qtd Exames</th>
        </tr>
      </thead>
      <tbody>
  `;

    // Ordena do mais recente para o mais antigo
    const ordenados = [...dados].sort((a, b) => parseDataBR(b.data) - parseDataBR(a.data));

    ordenados.forEach(r => {
        html += `
      <tr>
        <td>${r.data}</td>
        <td>${r.setor}</td>
        <td>${r.funcionario}</td>
        <td class="text-right"><strong>${r.qtdExames}</strong></td>
      </tr>
    `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/* ---------------- HELPERS DE DATA ---------------- */
function parseDataBR(dataStr) {
    if (!dataStr) return null;
    const partes = dataStr.split("/");
    if (partes.length === 3) {
        return new Date(partes[2], partes[1] - 1, partes[0]);
    }
    return null;
}

function formatarDataInput(dateObj) {
    const ano = dateObj.getFullYear();
    const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dia = String(dateObj.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}
