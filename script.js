// DADOS INICIAIS
let db = {
    clientes: [],
    veiculos: [],
    ordens: [],
    usuarios: [
        { id: 1, nome: 'Administrador', login: 'AlexandreCosta', senha: 'Ale153312*', tipo: 'admin', status: 'ativo' }
    ],
    dadosOficina: {
        nome: 'Auto Mecânica Lourenço',
        cnpj: '',
        endereco: 'Rua das Oficinas, 123 - Centro',
        telefone: '(11) 99999-9999',
        email: 'contato@automecanicalourenco.com'
    },
    nextId: { cliente: 1, veiculo: 1, ordem: 1, usuario: 2 }
};

let currentUser = null;
let editingOS = null;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateDate();
    setupLogin();
    const now = new Date();
    document.getElementById('faturamentoMes').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});

function loadData() {
    const saved = localStorage.getItem('autoMecanicaDB');
    if (saved) { db = JSON.parse(saved); }
}

function saveData() {
    localStorage.setItem('autoMecanicaDB', JSON.stringify(db));
}

function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-BR', options);
}

// LOGIN
function setupLogin() {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const user = document.getElementById('loginUser').value;
        const pass = document.getElementById('loginPass').value;
        const found = db.usuarios.find(u => u.login === user && u.senha === pass && u.status === 'ativo');
        
        if (found) {
            currentUser = found;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainSystem').style.display = 'flex';
            document.getElementById('currentUserName').textContent = found.nome;
            document.getElementById('currentUserRole').textContent = found.tipo === 'admin' ? 'Administrador' : 'Usuário';
            if (found.tipo !== 'admin') { document.getElementById('adminSection').style.display = 'none'; }
            updateDashboard();
        } else {
            document.getElementById('loginError').style.display = 'flex';
            setTimeout(() => { document.getElementById('loginError').style.display = 'none'; }, 3000);
        }
    });
}

function togglePassword() {
    const passInput = document.getElementById('loginPass');
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
}

function logout() {
    currentUser = null;
    document.getElementById('mainSystem').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('adminSection').style.display = 'block';
}

function showForgotPassword() { alert('Entre em contato com o administrador do sistema para recuperar sua senha.'); }

// NAVIGATION
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(`section-${section}`).classList.add('active');
    event.target.closest('.nav-item').classList.add('active');
    
    const titles = {
        'dashboard': 'Painel de Controle', 'clientes': 'Clientes', 'veiculos': 'Veículos',
        'ordens': 'Ordens de Serviço', 'faturamento': 'Faturamento', 'importar': 'Importar Planilha',
        'exportar': 'Relatórios e Exportações', 'backup': 'Backup e Restauração',
        'usuarios': 'Usuários do Sistema', 'dadosOficina': 'Dados da Oficina'
    };
    
    document.getElementById('pageTitle').textContent = titles[section] || 'Painel de Controle';
    
    if (section === 'clientes') loadClientes();
    if (section === 'veiculos') loadVeiculos();
    if (section === 'ordens') loadOrdens();
    if (section === 'faturamento') updateFaturamento();
    if (section === 'usuarios') loadUsuarios();
    if (section === 'dadosOficina') loadDadosOficina();
}

function toggleSidebar() { document.querySelector('.sidebar').classList.toggle('collapsed'); }

// MODALS
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'osModal' && !editingOS) {
        document.getElementById('osNumero').value = `OS-${String(db.nextId.ordem).padStart(4, '0')}`;
        document.getElementById('osDataEntrada').value = new Date().toISOString().split('T')[0];
        loadClientesSelect('osCliente');
        document.getElementById('servicosBody').innerHTML = '';
        updateOSTotals();
    }
    if (modalId === 'veiculoModal') { loadClientesSelect('veiculoCliente'); }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'osModal') { editingOS = null; document.getElementById('osForm').reset(); document.getElementById('osId').value = ''; }
    if (modalId === 'clienteModal') { document.getElementById('clienteForm').reset(); document.getElementById('clienteId').value = ''; document.getElementById('clienteModalTitle').textContent = 'Novo Cliente'; }
    if (modalId === 'veiculoModal') { document.getElementById('veiculoForm').reset(); document.getElementById('veiculoId').value = ''; document.getElementById('veiculoModalTitle').textContent = 'Novo Veículo'; }
    if (modalId === 'usuarioModal') { document.getElementById('usuarioForm').reset(); document.getElementById('usuarioId').value = ''; document.getElementById('usuarioModalTitle').textContent = 'Novo Usuário'; }
}

function openAlterarSenhaModal() {
    document.getElementById('alterarSenhaForm').reset();
    openModal('alterarSenhaModal');
    document.getElementById('senhaAtual').focus();
}

function alterarSenha(e) {
    e.preventDefault();
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    if (senhaAtual !== currentUser.senha) { alert('A senha atual está incorreta.'); return; }
    if (novaSenha !== confirmarSenha) { alert('A confirmação da nova senha não confere.'); return; }

    const usuario = db.usuarios.find(u => u.id === currentUser.id);
    usuario.senha = novaSenha;
    currentUser.senha = novaSenha;
    saveData();
    closeModal('alterarSenhaModal');
    alert('Senha alterada com sucesso!');
}

function toggleBusca(tipo) {
    let painel = document.getElementById(`${tipo}SearchPanel`);
    const campoId = `${tipo}Search`;
    if (!painel) {
        const section = document.getElementById(`section-${tipo}`);
        painel = document.createElement('div');
        painel.id = `${tipo}SearchPanel`;
        painel.className = 'search-panel';
        painel.innerHTML = `<i class="fas fa-search"></i><input type="search" id="${campoId}">`;
        const campoCriado = painel.querySelector('input');
        campoCriado.placeholder = tipo === 'clientes' ? 'Pesquisar por nome, CPF, telefone ou e-mail' : 'Pesquisar por placa, veículo ou cliente';
        campoCriado.addEventListener('input', tipo === 'clientes' ? loadClientes : loadVeiculos);
        section.querySelector('.table-container').before(painel);
    }
    const campo = document.getElementById(campoId);
    const estaAberto = painel.classList.toggle('active');
    if (estaAberto) { campo.focus(); } 
    else { campo.value = ''; tipo === 'clientes' ? loadClientes() : loadVeiculos(); }
}

// CLIENTES
function loadClientes() {
    const tbody = document.getElementById('clientesTable');
    const termo = normalizarConsulta(document.getElementById('clientesSearch')?.value || '');
    tbody.innerHTML = '';
    db.clientes.filter(c => !termo || normalizarConsulta(`${c.nome} ${c.cpf} ${c.telefone} ${c.email || ''}`).includes(termo)).forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${c.id}</td><td>${c.nome}</td><td>${c.cpf}</td><td>${c.telefone}</td><td>${c.email || '-'}</td>
        <td><button class="btn-icon edit" onclick="editCliente(${c.id})"><i class="fas fa-edit"></i></button>
        ${currentUser.tipo === 'admin' ? `<button class="btn-icon delete" onclick="deleteCliente(${c.id})"><i class="fas fa-trash"></i></button>` : ''}</td>`;
        tbody.appendChild(tr);
    });
}

function saveCliente(e) {
    e.preventDefault();
    const id = document.getElementById('clienteId').value;
    const data = { nome: document.getElementById('clienteNome').value, cpf: document.getElementById('clienteCpf').value, telefone: document.getElementById('clienteTelefone').value, email: document.getElementById('clienteEmail').value, endereco: document.getElementById('clienteEndereco').value };
    if (id) { const idx = db.clientes.findIndex(c => c.id == id); db.clientes[idx] = { ...db.clientes[idx], ...data }; } 
    else { data.id = db.nextId.cliente++; db.clientes.push(data); }
    saveData(); closeModal('clienteModal'); loadClientes(); updateDashboard();
}

function editCliente(id) {
    const c = db.clientes.find(cl => cl.id === id);
    document.getElementById('clienteId').value = c.id;
    document.getElementById('clienteNome').value = c.nome;
    document.getElementById('clienteCpf').value = c.cpf;
    document.getElementById('clienteTelefone').value = c.telefone;
    document.getElementById('clienteEmail').value = c.email || '';
    document.getElementById('clienteEndereco').value = c.endereco || '';
    document.getElementById('clienteModalTitle').textContent = 'Editar Cliente';
    openModal('clienteModal');
}

function deleteCliente(id) {
    if (confirm('Deseja realmente excluir este cliente?')) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        saveData(); loadClientes(); updateDashboard();
    }
}

// VEÍCULOS
function loadVeiculos() {
    const tbody = document.getElementById('veiculosTable');
    const termo = normalizarConsulta(document.getElementById('veiculosSearch')?.value || '');
    tbody.innerHTML = '';
    db.veiculos.filter(v => {
        const cliente = db.clientes.find(c => c.id === v.clienteId);
        return !termo || normalizarConsulta(`${v.placa} ${v.marca} ${v.modelo} ${v.ano} ${v.cor || ''} ${cliente ? cliente.nome : ''}`).includes(termo);
    }).forEach(v => {
        const cliente = db.clientes.find(c => c.id === v.clienteId);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${v.id}</td><td>${v.placa}</td><td>${v.marca} ${v.modelo}</td><td>${v.ano}</td><td>${v.cor || '-'}</td><td>${cliente ? cliente.nome : '-'}</td>
        <td><button class="btn-icon edit" onclick="editVeiculo(${v.id})"><i class="fas fa-edit"></i></button>
        ${currentUser.tipo === 'admin' ? `<button class="btn-icon delete" onclick="deleteVeiculo(${v.id})"><i class="fas fa-trash"></i></button>` : ''}</td>`;
        tbody.appendChild(tr);
    });
}

function saveVeiculo(e) {
    e.preventDefault();
    const id = document.getElementById('veiculoId').value;
    const data = { placa: document.getElementById('veiculoPlaca').value, marca: document.getElementById('veiculoMarca').value, modelo: document.getElementById('veiculoModelo').value, ano: document.getElementById('veiculoAno').value, cor: document.getElementById('veiculoCor').value, renavam: document.getElementById('veiculoRenavam').value, clienteId: parseInt(document.getElementById('veiculoCliente').value) };
    if (id) { const idx = db.veiculos.findIndex(v => v.id == id); db.veiculos[idx] = { ...db.veiculos[idx], ...data }; } 
    else { data.id = db.nextId.veiculo++; db.veiculos.push(data); }
    saveData(); closeModal('veiculoModal'); loadVeiculos(); updateDashboard();
}

function editVeiculo(id) {
    const v = db.veiculos.find(ve => ve.id === id);
    document.getElementById('veiculoId').value = v.id;
    document.getElementById('veiculoPlaca').value = v.placa;
    document.getElementById('veiculoMarca').value = v.marca;
    document.getElementById('veiculoModelo').value = v.modelo;
    document.getElementById('veiculoAno').value = v.ano;
    document.getElementById('veiculoCor').value = v.cor || '';
    document.getElementById('veiculoRenavam').value = v.renavam || '';
    loadClientesSelect('veiculoCliente');
    document.getElementById('veiculoCliente').value = v.clienteId;
    document.getElementById('veiculoModalTitle').textContent = 'Editar Veículo';
    openModal('veiculoModal');
}

function deleteVeiculo(id) {
    if (confirm('Deseja realmente excluir este veículo?')) {
        db.veiculos = db.veiculos.filter(v => v.id !== id);
        saveData(); loadVeiculos(); updateDashboard();
    }
}

function loadClientesSelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Selecione o cliente</option>';
    db.clientes.forEach(c => { select.innerHTML += `<option value="${c.id}">${c.nome}</option>`; });
}

function loadVeiculosByCliente() {
    const clienteId = parseInt(document.getElementById('osCliente').value);
    const select = document.getElementById('osVeiculo');
    select.innerHTML = '<option value="">Selecione o veículo</option>';
    if (clienteId) {
        db.veiculos.filter(v => v.clienteId === clienteId).forEach(v => {
            select.innerHTML += `<option value="${v.id}">${v.placa} - ${v.marca} ${v.modelo}</option>`;
        });
    }
}

// ORDENS DE SERVIÇO
function openConsultaOS() {
    document.getElementById('consultaPlaca').value = '';
    document.getElementById('consultaCliente').value = '';
    openModal('consultaOSModal');
    consultarOS();
    document.getElementById('consultaPlaca').focus();
}

function normalizarConsulta(valor) {
    return (valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function consultarOS() {
    const placa = normalizarConsulta(document.getElementById('consultaPlaca').value);
    const clienteNome = normalizarConsulta(document.getElementById('consultaCliente').value);
    const tbody = document.getElementById('consultaOSTable');
    const resumo = document.getElementById('consultaOSResumo');

    const resultados = db.ordens.filter(o => {
        const cliente = db.clientes.find(c => c.id === o.clienteId);
        const veiculo = db.veiculos.find(v => v.id === o.veiculoId);
        const correspondePlaca = !placa || normalizarConsulta(veiculo ? veiculo.placa : '').includes(placa);
        const correspondeCliente = !clienteNome || normalizarConsulta(cliente ? cliente.nome : '').includes(clienteNome);
        return correspondePlaca && correspondeCliente;
    });

    resumo.textContent = resultados.length === 1 ? '1 ordem de serviço encontrada.' : `${resultados.length} ordens de serviço encontradas.`;
    tbody.innerHTML = '';

    resultados.forEach(o => {
        const cliente = db.clientes.find(c => c.id === o.clienteId);
        const veiculo = db.veiculos.find(v => v.id === o.veiculoId);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${o.numero}</td><td>${cliente ? cliente.nome : '-'}</td><td>${veiculo ? veiculo.placa : '-'}</td>
        <td><span class="status-badge status-${o.status}">${getStatusLabel(o.status)}</span></td>
        <td><button class="btn-icon view" title="Visualizar OS" onclick="visualizarOSDaConsulta(${o.id})"><i class="fas fa-eye"></i></button></td>`;
        tbody.appendChild(tr);
    });
}

function limparConsultaOS() {
    document.getElementById('consultaPlaca').value = '';
    document.getElementById('consultaCliente').value = '';
    consultarOS();
    document.getElementById('consultaPlaca').focus();
}

function visualizarOSDaConsulta(id) { closeModal('consultaOSModal'); viewOS(id); }

function loadOrdens() {
    const tbody = document.getElementById('ordensTable');
    tbody.innerHTML = '';
    db.ordens.forEach(o => {
        const cliente = db.clientes.find(c => c.id === o.clienteId);
        const veiculo = db.veiculos.find(v => v.id === o.veiculoId);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${o.numero}</td><td>${cliente ? cliente.nome : '-'}</td><td>${veiculo ? `${veiculo.placa} - ${veiculo.marca}` : '-'}</td>
        <td>${formatDate(o.dataEntrada)}</td><td>${formatCurrency(o.valorTotal)}</td>
        <td><span class="status-badge status-${o.status}">${getStatusLabel(o.status)}</span></td>
        <td><button class="btn-icon view" onclick="viewOS(${o.id})"><i class="fas fa-eye"></i></button>
        <button class="btn-icon edit" onclick="editOS(${o.id})"><i class="fas fa-edit"></i></button>
        ${currentUser.tipo === 'admin' ? `<button class="btn-icon delete" onclick="deleteOS(${o.id})"><i class="fas fa-trash"></i></button>` : ''}</td>`;
        tbody.appendChild(tr);
    });
}

function saveOS(e) {
    e.preventDefault();
    const id = document.getElementById('osId').value;
    const servicos = [];
    document.querySelectorAll('#servicosBody tr').forEach(row => {
        servicos.push({
            tipo: row.querySelector('.serv-tipo').value, descricao: row.querySelector('.serv-desc').value,
            qtdPecas: parseFloat(row.querySelector('.serv-qtd').value) || 0,
            valorPecaUnit: parseFloat(row.querySelector('.serv-valor-peca').value) || 0,
            valorPecas: parseFloat(row.querySelector('.serv-total-pecas').textContent.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
            maoObra: parseFloat(row.querySelector('.serv-mao-obra').value) || 0,
            subtotal: parseFloat(row.querySelector('.serv-subtotal').textContent.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
        });
    });
    const totalPecas = servicos.reduce((sum, s) => sum + s.valorPecas, 0);
    const totalMaoObra = servicos.reduce((sum, s) => sum + s.maoObra, 0);
    const data = {
        numero: document.getElementById('osNumero').value, dataEntrada: document.getElementById('osDataEntrada').value,
        dataPrevisao: document.getElementById('osDataPrevisao').value, status: document.getElementById('osStatus').value,
        clienteId: parseInt(document.getElementById('osCliente').value), veiculoId: parseInt(document.getElementById('osVeiculo').value),
        descricao: document.getElementById('osDescricao').value, servicos, totalPecas, totalMaoObra, valorTotal: totalPecas + totalMaoObra
    };
    if (id) { const idx = db.ordens.findIndex(o => o.id == id); db.ordens[idx] = { ...db.ordens[idx], ...data }; } 
    else { data.id = db.nextId.ordem++; db.ordens.push(data); }
    saveData(); closeModal('osModal'); loadOrdens(); updateDashboard();
}

function editOS(id) {
    if (currentUser.tipo !== 'admin') { alert('Apenas administradores podem editar ordens de serviço.'); return; }
    editingOS = true;
    const o = db.ordens.find(or => or.id === id);
    document.getElementById('osId').value = o.id;
    document.getElementById('osNumero').value = o.numero;
    document.getElementById('osDataEntrada').value = o.dataEntrada;
    document.getElementById('osDataPrevisao').value = o.dataPrevisao || '';
    document.getElementById('osStatus').value = o.status;
    document.getElementById('osDescricao').value = o.descricao || '';
    loadClientesSelect('osCliente');
    document.getElementById('osCliente').value = o.clienteId;
    loadVeiculosByCliente();
    document.getElementById('osVeiculo').value = o.veiculoId;
    document.getElementById('servicosBody').innerHTML = '';
    o.servicos.forEach(s => addServicoRow(s));
    updateOSTotals();
    document.getElementById('osModalTitle').textContent = 'Editar Ordem de Serviço';
    openModal('osModal');
}

function deleteOS(id) {
    if (currentUser.tipo !== 'admin') { alert('Apenas administradores podem excluir ordens de serviço.'); return; }
    if (confirm('Deseja realmente excluir esta ordem de serviço?')) {
        db.ordens = db.ordens.filter(o => o.id !== id);
        saveData(); loadOrdens(); updateDashboard();
    }
}

function viewOS(id) {
    const o = db.ordens.find(or => or.id === id);
    const cliente = db.clientes.find(c => c.id === o.clienteId);
    const veiculo = db.veiculos.find(v => v.id === o.veiculoId);
    let servicosHTML = '';
    o.servicos.forEach((s, i) => {
        servicosHTML += `<tr><td>${i + 1}</td><td>${s.tipo}</td><td>${s.descricao}</td><td>${s.qtdPecas}</td>
        <td>${formatCurrency(s.valorPecaUnit)}</td><td>${formatCurrency(s.valorPecas)}</td>
        <td>${formatCurrency(s.maoObra)}</td><td>${formatCurrency(s.subtotal)}</td></tr>`;
    });
    document.getElementById('osPrintContent').innerHTML = `
        <div class="os-print-header">
            <h2>${db.dadosOficina.nome}</h2><p>${db.dadosOficina.endereco}</p>
            <p>Tel: ${db.dadosOficina.telefone} | Email: ${db.dadosOficina.email}</p>
            <h3 style="margin-top: 15px;">ORDEM DE SERVIÇO Nº ${o.numero}</h3>
        </div>
        <div class="os-print-info">
            <div><label>Cliente</label><span>${cliente ? cliente.nome : '-'}</span></div>
            <div><label>CPF</label><span>${cliente ? cliente.cpf : '-'}</span></div>
            <div><label>Veículo</label><span>${veiculo ? `${veiculo.placa} - ${veiculo.marca} ${veiculo.modelo}` : '-'}</span></div>
            <div><label>Ano/Cor</label><span>${veiculo ? `${veiculo.ano} / ${veiculo.cor || '-'}` : '-'}</span></div>
            <div><label>Data Entrada</label><span>${formatDate(o.dataEntrada)}</span></div>
            <div><label>Previsão</label><span>${o.dataPrevisao ? formatDate(o.dataPrevisao) : '-'}</span></div>
            <div><label>Status</label><span>${getStatusLabel(o.status)}</span></div>
            <div><label>Telefone Cliente</label><span>${cliente ? cliente.telefone : '-'}</span></div>
        </div>
        ${o.descricao ? `<div style="margin-bottom: 20px;"><label style="font-weight: 600;">Descrição do Problema:</label><p>${o.descricao}</p></div>` : ''}
        <table class="os-print-table"><thead><tr><th>#</th><th>Serviço</th><th>Descrição</th><th>Qtd</th><th>Valor Peça</th><th>Total Peças</th><th>Mão de Obra</th><th>Subtotal</th></tr></thead><tbody>${servicosHTML}</tbody></table>
        <div class="os-print-total">
            <div class="total-row"><span>Total Peças:</span><span>${formatCurrency(o.totalPecas)}</span></div>
            <div class="total-row"><span>Total Mão de Obra:</span><span>${formatCurrency(o.totalMaoObra)}</span></div>
            <div class="total-row total-final"><span>VALOR TOTAL:</span><span>${formatCurrency(o.valorTotal)}</span></div>
        </div>
        <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; text-align: center;">
            <div><div style="border-top: 1px solid #333; padding-top: 10px;"><p>Assinatura do Cliente</p></div></div>
            <div><div style="border-top: 1px solid #333; padding-top: 10px;"><p>Assinatura do Responsável</p></div></div>
        </div>`;
    openModal('osViewModal');
}

function printOS() { window.print(); }

function addServicoRow(data = null) {
    const tbody = document.getElementById('servicosBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" class="serv-tipo" placeholder="Tipo de serviço" value="${data ? data.tipo : ''}"></td>
    <td><input type="text" class="serv-desc" placeholder="Descrição" value="${data ? data.descricao : ''}"></td>
    <td><input type="number" class="serv-qtd" placeholder="0" min="0" step="1" value="${data ? data.qtdPecas : ''}" onchange="calcServicoRow(this)"></td>
    <td><input type="number" class="serv-valor-peca" placeholder="0,00" min="0" step="0.01" value="${data ? data.valorPecaUnit : ''}" onchange="calcServicoRow(this)"></td>
    <td class="serv-total-pecas">${data ? formatCurrency(data.valorPecas) : 'R$ 0,00'}</td>
    <td><input type="number" class="serv-mao-obra" placeholder="0,00" min="0" step="0.01" value="${data ? data.maoObra : ''}" onchange="calcServicoRow(this)"></td>
    <td class="serv-subtotal">${data ? formatCurrency(data.subtotal) : 'R$ 0,00'}</td>
    <td><button type="button" class="btn-icon delete" onclick="this.closest('tr').remove(); updateOSTotals();"><i class="fas fa-times"></i></button></td>`;
    tbody.appendChild(tr);
}

function calcServicoRow(input) {
    const row = input.closest('tr');
    const qtd = parseFloat(row.querySelector('.serv-qtd').value) || 0;
    const valorPeca = parseFloat(row.querySelector('.serv-valor-peca').value) || 0;
    const maoObra = parseFloat(row.querySelector('.serv-mao-obra').value) || 0;
    const totalPecas = qtd * valorPeca;
    row.querySelector('.serv-total-pecas').textContent = formatCurrency(totalPecas);
    row.querySelector('.serv-subtotal').textContent = formatCurrency(totalPecas + maoObra);
    updateOSTotals();
}

function updateOSTotals() {
    let totalPecas = 0, totalMaoObra = 0;
    document.querySelectorAll('#servicosBody tr').forEach(row => {
        totalPecas += (parseFloat(row.querySelector('.serv-qtd').value) || 0) * (parseFloat(row.querySelector('.serv-valor-peca').value) || 0);
        totalMaoObra += parseFloat(row.querySelector('.serv-mao-obra').value) || 0;
    });
    document.getElementById('osTotalPecas').textContent = formatCurrency(totalPecas);
    document.getElementById('osTotalMaoObra').textContent = formatCurrency(totalMaoObra);
    document.getElementById('osTotalGeral').textContent = formatCurrency(totalPecas + totalMaoObra);
}

// USUÁRIOS
function loadUsuarios() {
    const tbody = document.getElementById('usuariosTable');
    tbody.innerHTML = '';
    db.usuarios.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${u.id}</td><td>${u.nome}</td><td>${u.login}</td><td>${u.tipo === 'admin' ? 'Administrador' : 'Usuário'}</td>
        <td><span class="status-badge status-${u.status === 'ativo' ? 'concluida' : 'cancelada'}">${u.status}</span></td>
        <td><button class="btn-icon edit" onclick="editUsuario(${u.id})"><i class="fas fa-edit"></i></button>
        ${u.id !== 1 ? `<button class="btn-icon delete" onclick="deleteUsuario(${u.id})"><i class="fas fa-trash"></i></button>` : ''}</td>`;
        tbody.appendChild(tr);
    });
}

function saveUsuario(e) {
    e.preventDefault();
    const id = document.getElementById('usuarioId').value;
    const data = { nome: document.getElementById('usuarioNome').value, login: document.getElementById('usuarioLogin').value, senha: document.getElementById('usuarioSenha').value, tipo: document.getElementById('usuarioTipo').value, status: document.getElementById('usuarioStatus').value };
    if (id) { const idx = db.usuarios.findIndex(u => u.id == id); db.usuarios[idx] = { ...db.usuarios[idx], ...data }; } 
    else { data.id = db.nextId.usuario++; db.usuarios.push(data); }
    saveData(); closeModal('usuarioModal'); loadUsuarios();
}

function editUsuario(id) {
    const u = db.usuarios.find(us => us.id === id);
    document.getElementById('usuarioId').value = u.id;
    document.getElementById('usuarioNome').value = u.nome;
    document.getElementById('usuarioLogin').value = u.login;
    document.getElementById('usuarioSenha').value = u.senha;
    document.getElementById('usuarioTipo').value = u.tipo;
    document.getElementById('usuarioStatus').value = u.status;
    document.getElementById('usuarioModalTitle').textContent = 'Editar Usuário';
    openModal('usuarioModal');
}

function deleteUsuario(id) {
    if (confirm('Deseja realmente excluir este usuário?')) {
        db.usuarios = db.usuarios.filter(u => u.id !== id);
        saveData(); loadUsuarios();
    }
}

// DADOS DA OFICINA
function loadDadosOficina() {
    document.getElementById('oficinaNome').value = db.dadosOficina.nome;
    document.getElementById('oficinaCnpj').value = db.dadosOficina.cnpj || '';
    document.getElementById('oficinaEndereco').value = db.dadosOficina.endereco;
    document.getElementById('oficinaTelefone').value = db.dadosOficina.telefone;
    document.getElementById('oficinaEmail').value = db.dadosOficina.email || '';
}

function saveDadosOficina(e) {
    e.preventDefault();
    db.dadosOficina = {
        nome: document.getElementById('oficinaNome').value, cnpj: document.getElementById('oficinaCnpj').value,
        endereco: document.getElementById('oficinaEndereco').value, telefone: document.getElementById('oficinaTelefone').value,
        email: document.getElementById('oficinaEmail').value
    };
    saveData();
    alert('Dados da oficina salvos com sucesso!');
}

// FATURAMENTO
function updateFaturamento() {
    const periodo = document.getElementById('faturamentoPeriodo').value;
    const mes = document.getElementById('faturamentoMes').value;
    const ano = parseInt(document.getElementById('faturamentoAno').value);
    let filtered = db.ordens.filter(o => o.status === 'concluida');
    if (periodo === 'mensal' && mes) { filtered = filtered.filter(o => o.dataEntrada.startsWith(mes)); } 
    else if (periodo === 'anual') { filtered = filtered.filter(o => o.dataEntrada.startsWith(ano.toString())); }
    
    const totalPecas = filtered.reduce((sum, o) => sum + (o.totalPecas || 0), 0);
    const totalMaoObra = filtered.reduce((sum, o) => sum + (o.totalMaoObra || 0), 0);
    document.getElementById('fatTotal').textContent = formatCurrency(totalPecas + totalMaoObra);
    document.getElementById('fatMaoObra').textContent = formatCurrency(totalMaoObra);
    document.getElementById('fatPecas').textContent = formatCurrency(totalPecas);
    document.getElementById('fatOrdens').textContent = filtered.length;
}

// EXPORTAÇÕES
function escapeHTML(valor) { return String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function dadosOrdensExportacao() { return db.ordens.map(o => { const c = db.clientes.find(x => x.id === o.clienteId); const v = db.veiculos.find(x => x.id === o.veiculoId); return [o.numero, c ? c.nome : '-', c ? c.cpf : '-', v ? v.placa : '-', v ? `${v.marca} ${v.modelo}` : '-', formatDate(o.dataEntrada), getStatusLabel(o.status), o.totalPecas || 0, o.totalMaoObra || 0, o.valorTotal || 0]; }); }
function dadosFaturamentoExportacao() { return db.ordens.filter(o => o.status === 'concluida').map(o => { const c = db.clientes.find(x => x.id === o.clienteId); const v = db.veiculos.find(x => x.id === o.veiculoId); return [o.numero, formatDate(o.dataEntrada), c ? c.nome : '-', v ? v.placa : '-', o.totalPecas || 0, o.totalMaoObra || 0, o.valorTotal || 0]; }); }
function baixarExcel(nomeArquivo, titulo, cabecalhos, linhas) {
    const tabela = `<table><thead><tr>${cabecalhos.map(c => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map(v => `<td>${escapeHTML(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const blob = new Blob(['\ufeff', `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><h2>${escapeHTML(titulo)}</h2>${tabela}</body></html>`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${nomeArquivo}.xls`; document.body.appendChild(link); link.click(); link.remove();
}
function exportarOrdensExcel() { baixarExcel('ordens-de-servico', 'Relatório de OS', ['Nº OS', 'Cliente', 'CPF', 'Placa', 'Veículo', 'Data', 'Status', 'Peças', 'Mão de Obra', 'Total'], dadosOrdensExportacao()); }
function exportarFaturamentoExcel() { baixarExcel('faturamento', 'Relatório de Faturamento', ['Nº OS', 'Data', 'Cliente', 'Placa', 'Peças', 'Mão de Obra', 'Total'], dadosFaturamentoExportacao()); }
function abrirRelatorioPDF(titulo, cabecalhos, linhas, resumo = '') {
    const janela = window.open('', '_blank');
    if (!janela) return alert('Permita a abertura de janelas para gerar o PDF.');
    const tabela = `<table><thead><tr>${cabecalhos.map(c => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map(v => `<td>${escapeHTML(typeof v === 'number' ? formatCurrency(v) : v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    janela.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHTML(titulo)}</title><style>body{font-family:Arial,sans-serif;color:#222;margin:28px}h1{color:#1a3a5c}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}th,td{border:1px solid #bbb;padding:8px;text-align:left}th{background:#eef3f8}</style></head><body><h1>${escapeHTML(db.dadosOficina.nome)}</h1><p>${escapeHTML(titulo)} · ${new Date().toLocaleDateString('pt-BR')}</p>${resumo}${tabela}<script>window.onload=function(){window.print();};<\/script></body></html>`);
    janela.document.close();
}
function exportarOrdensPDF() { abrirRelatorioPDF('Relatório de OS', ['Nº OS', 'Cliente', 'Placa', 'Data', 'Status', 'Peças', 'Mão de Obra', 'Total'], dadosOrdensExportacao().map(l => [l[0], l[1], l[3], l[5], l[6], l[7], l[8], l[9]])); }
function exportarFaturamentoPDF() {
    const linhas = dadosFaturamentoExportacao();
    const resumo = `<p><strong>OS concluídas:</strong> ${linhas.length} | <strong>Peças:</strong> ${formatCurrency(linhas.reduce((t, l) => t + l[4], 0))} | <strong>Mão de obra:</strong> ${formatCurrency(linhas.reduce((t, l) => t + l[5], 0))} | <strong>Total:</strong> ${formatCurrency(linhas.reduce((t, l) => t + l[6], 0))}</p>`;
    abrirRelatorioPDF('Relatório de Faturamento', ['Nº OS', 'Data', 'Cliente', 'Placa', 'Peças', 'Mão de Obra', 'Total'], linhas, resumo);
}

// IMPORTAR EXCEL (CSV)
function importExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split('\n');
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 7) {
                const nomeCliente = cols[0].trim(), cpfCliente = cols[1].trim(), placa = cols[2].trim();
                const tipoServico = cols[3].trim(), valorPecas = parseFloat(cols[4]) || 0, valorMaoObra = parseFloat(cols[5]) || 0, dataServico = cols[6].trim();
                
                let cliente = db.clientes.find(c => c.cpf === cpfCliente);
                if (!cliente) { cliente = { id: db.nextId.cliente++, nome: nomeCliente, cpf: cpfCliente, telefone: '', email: '' }; db.clientes.push(cliente); }
                
                let veiculo = db.veiculos.find(v => v.placa === placa && v.clienteId === cliente.id);
                if (!veiculo) { veiculo = { id: db.nextId.veiculo++, placa, marca: 'Importado', modelo: '', ano: '2020', cor: '', clienteId: cliente.id }; db.veiculos.push(veiculo); }
                
                const os = {
                    id: db.nextId.ordem++, numero: `OS-${String(db.nextId.ordem - 1).padStart(4, '0')}`,
                    dataEntrada: dataServico, status: 'concluida', clienteId: cliente.id, veiculoId: veiculo.id,
                    servicos: [{ tipo: tipoServico, descricao: tipoServico, qtdPecas: 1, valorPecaUnit: valorPecas, valorPecas, maoObra: valorMaoObra, subtotal: valorPecas + valorMaoObra }],
                    totalPecas: valorPecas, totalMaoObra: valorMaoObra, valorTotal: valorPecas + valorMaoObra
                };
                db.ordens.push(os);
                imported++;
            }
        }
        saveData();
        alert(`${imported} serviços importados com sucesso!`);
        updateDashboard();
    };
    reader.readAsText(file);
}

// DASHBOARD
function updateDashboard() {
    document.getElementById('statClientes').textContent = db.clientes.length;
    document.getElementById('statVeiculos').textContent = db.veiculos.length;
    document.getElementById('statOrdens').textContent = db.ordens.length;
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const fatMensal = db.ordens.filter(o => o.status === 'concluida' && o.dataEntrada.startsWith(mesAtual)).reduce((sum, o) => sum + (o.valorTotal || 0), 0);
    document.getElementById('statFaturamento').textContent = formatCurrency(fatMensal);
    
    const tbody = document.getElementById('recentOrdersTable');
    tbody.innerHTML = '';
    const recent = [...db.ordens].sort((a, b) => b.id - a.id).slice(0, 5);
    recent.forEach(o => {
        const cliente = db.clientes.find(c => c.id === o.clienteId);
        const veiculo = db.veiculos.find(v => v.id === o.veiculoId);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${o.numero}</td><td>${cliente ? cliente.nome : '-'}</td><td>${veiculo ? `${veiculo.placa} - ${veiculo.marca}` : '-'}</td>
        <td>${formatDate(o.dataEntrada)}</td><td>${formatCurrency(o.valorTotal)}</td>
        <td><span class="status-badge status-${o.status}">${getStatusLabel(o.status)}</span></td>`;
        tbody.appendChild(tr);
    });
}

// UTILS
function formatCurrency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); }
function formatDate(date) { if (!date) return '-'; const [y, m, d] = date.split('-'); return `${d}/${m}/${y}`; }
function getStatusLabel(status) { return { 'aberta': 'Aberta', 'andamento': 'Em Andamento', 'concluida': 'Concluída', 'cancelada': 'Cancelada' }[status] || status; }

// ========== SISTEMA DE BACKUP E RESTAURAÇÃO ==========
function fazerBackup() {
    const dados = localStorage.getItem('autoMecanicaDB');
    if (!dados) { alert('Não há dados para fazer backup!'); return; }
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `backup-auto-mecanica-${dataAtual}.json`;
    const blob = new Blob([dados], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = nomeArquivo;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
    alert(`✅ Backup realizado com sucesso!\n\nArquivo: ${nomeArquivo}\n\nGUARDE ESTE ARQUIVO EM LOCAL SEGURO!`);
}

function restaurarBackup(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (!dados.clientes || !dados.veiculos || !dados.ordens) { alert('❌ Arquivo de backup inválido!'); return; }
            if (confirm(`⚠️ ATENÇÃO!\n\nIsso substituirá TODOS os dados atuais pelos dados do backup.\n\nDeseja continuar?`)) {
                localStorage.setItem('autoMecanicaDB', JSON.stringify(dados));
                alert('✅ Backup restaurado com sucesso!\n\nA página será recarregada.');
                location.reload();
            }
        } catch (erro) { alert('❌ Erro ao ler arquivo de backup: ' + erro.message); }
    };
    reader.readAsText(arquivo);
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) { e.target.classList.remove('active'); }
});