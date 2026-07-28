// ==========================================
// 1. IMPORTAÇÕES DO FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ⚠️ SUBSTITUA PELAS SUAS CREDENCIAIS REAIS DO FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBSElbhr-e-CcpQ2FE8btxy1IJoVT-pcq8",
  authDomain: "oficina-lourenco.firebaseapp.com",
  projectId: "oficina-lourenco",
  storageBucket: "oficina-lourenco.firebasestorage.app",
  messagingSenderId: "306744419215",
  appId: "1:306744419215:web:1b2ed7a3270d9e799021fa"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ==========================================
// 2. ESTADO GLOBAL DA APLICAÇÃO
// ==========================================
let appData = {
    clientes: [],
    veiculos: [],
    ordens: [],
    usuarios: [],
    dadosOficina: {}
};

let currentUser = null;
let editingOS = null;

// ==========================================
// 3. FUNÇÕES AUXILIARES DE BANCO DE DADOS
// ==========================================
async function saveDocument(collName, data, docId = null) {
    if (docId) {
        const ref = doc(db, collName, docId);
        await updateDoc(ref, data);
        return docId;
    } else {
        const ref = await addDoc(collection(db, collName), data);
        return ref.id;
    }
}

async function deleteDocument(collName, docId) {
    const ref = doc(db, collName, docId);
    await deleteDoc(ref);
}

async function loadAllData() {
    try {
        // Carregar Usuários
        const userSnap = await getDocs(collection(db, "usuarios"));
        appData.usuarios = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Se não houver usuários, criar o administrador padrão
        if (appData.usuarios.length === 0) {
            const defaultAdmin = { 
                nome: 'Administrador', 
                login: 'admin@lourenco.com', // Este será o email no Firebase Auth
                senha: 'Ale153312*', 
                tipo: 'admin', 
                status: 'ativo' 
            };
            const newId = await saveDocument('usuarios', defaultAdmin);
            appData.usuarios.push({ id: newId, ...defaultAdmin });
            console.log("⚠️ Usuário admin padrão criado. Crie esta conta no Firebase Authentication!");
        }

        // Carregar demais coleções
        const clientesSnap = await getDocs(collection(db, "clientes"));
        appData.clientes = clientesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const veiculosSnap = await getDocs(collection(db, "veiculos"));
        appData.veiculos = veiculosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const ordensSnap = await getDocs(collection(db, "ordens"));
        appData.ordens = ordensSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const oficinaSnap = await getDocs(collection(db, "dadosOficina"));
        if (!oficinaSnap.empty) {
            appData.dadosOficina = oficinaSnap.docs[0].data();
            appData.dadosOficina.id = oficinaSnap.docs[0].id;
        } else {
            appData.dadosOficina = {
                nome: 'Auto Mecânica Lourenço',
                cnpj: '',
                endereco: 'Rua Arnaldo Bonaventura, 649 - Cidade Tiradentes - SP',
                telefone: '(11) 96400-9152',
                email: 'contato@automecanicalourenco.com'
            };
            const newId = await saveDocument('dadosOficina', appData.dadosOficina);
            appData.dadosOficina.id = newId;
        }
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        alert("Erro de conexão com o banco de dados. Verifique sua internet e as regras do Firestore.");
    }
}

// ==========================================
// 4. INICIALIZAÇÃO E AUTENTICAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    setupLogin();
    const now = new Date();
    document.getElementById('faturamentoMes').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});

function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-BR', options);
}

// ==========================================
// 5. LOGIN COM FIREBASE AUTH
// ==========================================
function setupLogin() {
    // Monitora estado de autenticação do Firebase
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Usuário autenticado no Firebase - carrega os dados
            await loadAllData();
            
            // Busca o documento do usuário no Firestore pelo email
            const found = appData.usuarios.find(u => u.login === user.email && u.status === 'ativo');
            
            if (found) {
                currentUser = found;
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('mainSystem').style.display = 'flex';
                document.getElementById('currentUserName').textContent = found.nome;
                document.getElementById('currentUserRole').textContent = found.tipo === 'admin' ? 'Administrador' : 'Usuário';
                if (found.tipo !== 'admin') { 
                    document.getElementById('adminSection').style.display = 'none'; 
                }
                updateDashboard();
            } else {
                // Usuário autenticado no Firebase mas não encontrado no sistema
                alert("Seu email está autenticado, mas não há cadastro ativo no sistema. Contate o administrador.");
                await signOut(auth);
            }
        } else {
            // Usuário deslogado
            currentUser = null;
            document.getElementById('mainSystem').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('adminSection').style.display = 'block';
        }
    });

    // Formulário de login
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginUser').value.trim();
        const password = document.getElementById('loginPass').value;
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // O onAuthStateChanged cuidará do resto
        } catch (error) {
            console.error("Erro no login:", error);
            document.getElementById('loginError').style.display = 'flex';
            setTimeout(() => { 
                document.getElementById('loginError').style.display = 'none'; 
            }, 3000);
        }
    });
}

function togglePassword() {
    const passInput = document.getElementById('loginPass');
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
}

async function logout() {
    try {
        await signOut(auth);
        // O onAuthStateChanged cuidará de esconder o sistema
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
    }
}

function showForgotPassword() { 
    alert('Entre em contato com o administrador do sistema para recuperar sua senha.'); 
}

// ==========================================
// 6. NAVEGAÇÃO E MODAIS
// ==========================================
function showSection(section, event) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(`section-${section}`).classList.add('active');
    
    if (event && event.target) {
        const navItem = event.target.closest('.nav-item');
        if (navItem) navItem.classList.add('active');
    }
    
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

function toggleSidebar() { 
    document.querySelector('.sidebar').classList.toggle('collapsed'); 
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'osModal' && !editingOS) {
        const nextNum = appData.ordens.length + 1;
        document.getElementById('osNumero').value = `OS-${String(nextNum).padStart(4, '0')}`;
        document.getElementById('osDataEntrada').value = new Date().toISOString().split('T')[0];
        loadClientesSelect('osCliente');
        document.getElementById('servicosBody').innerHTML = '';
        updateOSTotals();
    }
    if (modalId === 'veiculoModal') { 
        loadClientesSelect('veiculoCliente'); 
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'osModal') { 
        editingOS = null; 
        document.getElementById('osForm').reset(); 
        document.getElementById('osId').value = ''; 
    }
    if (modalId === 'clienteModal') { 
        document.getElementById('clienteForm').reset(); 
        document.getElementById('clienteId').value = ''; 
        document.getElementById('clienteModalTitle').textContent = 'Novo Cliente'; 
    }
    if (modalId === 'veiculoModal') { 
        document.getElementById('veiculoForm').reset(); 
        document.getElementById('veiculoId').value = ''; 
        document.getElementById('veiculoModalTitle').textContent = 'Novo Veículo'; 
    }
    if (modalId === 'usuarioModal') { 
        document.getElementById('usuarioForm').reset(); 
        document.getElementById('usuarioId').value = ''; 
        document.getElementById('usuarioModalTitle').textContent = 'Novo Usuário'; 
    }
}

function openAlterarSenhaModal() {
    document.getElementById('alterarSenhaForm').reset();
    openModal('alterarSenhaModal');
    document.getElementById('senhaAtual').focus();
}

async function alterarSenha(e) {
    e.preventDefault();
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    if (senhaAtual !== currentUser.senha) { 
        alert('A senha atual está incorreta.'); 
        return; 
    }
    if (novaSenha !== confirmarSenha) { 
        alert('A confirmação da nova senha não confere.'); 
        return; 
    }

    try {
        // Atualiza no Firestore
        await saveDocument('usuarios', { senha: novaSenha }, currentUser.id);
        
        // Atualiza no Firebase Auth (se o email for o mesmo)
        if (auth.currentUser && auth.currentUser.email === currentUser.login) {
            // Para alterar a senha no Firebase Auth, o usuário precisa estar logado
            // Isso é feito automaticamente pois ele está autenticado
            console.log("Senha atualizada no Firestore. Para alterar no Firebase Auth, use o console.");
        }
        
        currentUser.senha = novaSenha;
        const idx = appData.usuarios.findIndex(u => u.id === currentUser.id);
        appData.usuarios[idx].senha = novaSenha;

        closeModal('alterarSenhaModal');
        alert('Senha alterada com sucesso!');
    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        alert("Erro ao alterar senha. Tente novamente.");
    }
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
        campoCriado.placeholder = tipo === 'clientes' 
            ? 'Pesquisar por nome, CPF, telefone ou e-mail' 
            : 'Pesquisar por placa, veículo ou cliente';
        campoCriado.addEventListener('input', tipo === 'clientes' ? loadClientes : loadVeiculos);
        section.querySelector('.table-container').before(painel);
    }
    const campo = document.getElementById(campoId);
    const estaAberto = painel.classList.toggle('active');
    if (estaAberto) { 
        campo.focus(); 
    } else { 
        campo.value = ''; 
        tipo === 'clientes' ? loadClientes() : loadVeiculos(); 
    }
}

// ==========================================
// 7. CRUD CLIENTES
// ==========================================
function loadClientes() {
    const tbody = document.getElementById('clientesTable');
    const termo = normalizarConsulta(document.getElementById('clientesSearch')?.value || '');
    tbody.innerHTML = '';
    appData.clientes
        .filter(c => !termo || normalizarConsulta(`${c.nome} ${c.cpf} ${c.telefone} ${c.email || ''}`).includes(termo))
        .forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${c.nome}</td><td>${c.cpf}</td><td>${c.telefone}</td><td>${c.email || '-'}</td>
            <td><button class="btn-icon edit" onclick="editCliente('${c.id}')"><i class="fas fa-edit"></i></button>
            ${currentUser.tipo === 'admin' ? `<button class="btn-icon delete" onclick="deleteCliente('${c.id}')"><i class="fas fa-trash"></i></button>` : ''}</td>`;
            tbody.appendChild(tr);
        });
}

async function saveCliente(e) {
    e.preventDefault();
    const id = document.getElementById('clienteId').value;
    const data = { 
        nome: document.getElementById('clienteNome').value, 
        cpf: document.getElementById('clienteCpf').value, 
        telefone: document.getElementById('clienteTelefone').value, 
        email: document.getElementById('clienteEmail').value, 
        endereco: document.getElementById('clienteEndereco').value 
    };
    
    try {
        const newId = await saveDocument('clientes', data, id || undefined);

        if (id) {
            const idx = appData.clientes.findIndex(c => c.id === id);
            appData.clientes[idx] = { id, ...data };
        } else {
            appData.clientes.push({ id: newId, ...data });
        }
        
        closeModal('clienteModal'); 
        loadClientes(); 
        updateDashboard();
    } catch (error) {
        console.error("Erro ao salvar cliente:", error);
        alert("Erro ao salvar cliente. Verifique sua conexão.");
    }
}

function editCliente(id) {
    const c = appData.clientes.find(cl => cl.id === id);
    document.getElementById('clienteId').value = c.id;
    document.getElementById('clienteNome').value = c.nome;
    document.getElementById('clienteCpf').value = c.cpf;
    document.getElementById('clienteTelefone').value = c.telefone;
    document.getElementById('clienteEmail').value = c.email || '';
    document.getElementById('clienteEndereco').value = c.endereco || '';
    document.getElementById('clienteModalTitle').textContent = 'Editar Cliente';
    openModal('clienteModal');
}

async function deleteCliente(id) {
    if (confirm('Deseja realmente excluir este cliente?')) {
        try {
            await deleteDocument('clientes', id);
            appData.clientes = appData.clientes.filter(c => c.id !== id);
            loadClientes(); 
            updateDashboard();
        } catch (error) {
            console.error("Erro ao excluir cliente:", error);
            alert("Erro ao excluir cliente.");
        }
    }
}

// ==========================================
// 8. CRUD VEÍCULOS
// ==========================================
function loadVeiculos() {
    const tbody = document.getElementById('veiculosTable');
    const termo = normalizarConsulta(document.getElementById('veiculosSearch')?.value || '');
    tbody.innerHTML = '';
    appData.veiculos.filter(v => {
        const cliente = appData.clientes.find(c => c.id === v.clienteId);
        return !termo || normalizarConsulta(`${v.placa} ${v.marca} ${v.modelo} ${v.ano} ${v.cor || ''} ${cliente ? cliente.nome : ''}`).includes(termo);
    }).forEach(v => {
        const cliente = appData.clientes.find(c => c.id === v.clienteId);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${v.placa}</td><td>${v.marca} ${v.modelo}</td><td>${v.ano}</td><td>${v.cor || '-'}</td><td>${cliente ? cliente.nome : '-'}</td>
        <td><button class="btn-icon edit" onclick="editVeiculo('${v.id}')"><i class="fas fa-edit"></i></button>
        ${currentUser.tipo === 'admin' ? `<button class="btn-icon delete" onclick="deleteVeiculo('${v.id}')"><i class="fas fa-trash"></i></button>` : ''}</td>`;
        tbody.appendChild(tr);
    });
}

async function saveVeiculo(e) {
    e.preventDefault();
    const id = document.getElementById('veiculoId').value;
    const data = { 
        placa: document.getElementById('veiculoPlaca').value, 
        marca: document.getElementById('veiculoMarca').value, 
        modelo: document.getElementById('veiculoModelo').value, 
        ano: document.getElementById('veiculoAno').value, 
        cor: document.getElementById('veiculoCor').value, 
        renavam: document.getElementById('veiculoRenavam').value, 
        clienteId: document.getElementById('veiculoCliente').value
    };
    
    try {
        const newId = await saveDocument('veiculos', data, id || undefined);

        if (id) {
            const idx = appData.veiculos.findIndex(v => v.id === id);
            appData.veiculos[idx] = { id, ...data };
        } else {
            appData.veiculos.push({ id: newId, ...data });
        }
        
        closeModal('veiculoModal'); 
        loadVeiculos(); 
        updateDashboard();
    } catch (error) {
        console.error("Erro ao salvar veículo:", error);
        alert("Erro ao salvar veículo.");
    }
}

function editVeiculo(id) {
    const v = appData.veiculos.find(ve => ve.id === id);
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

async function deleteVeiculo(id) {
    if (confirm('Deseja realmente excluir este veículo?')) {
        try {
            await deleteDocument('veiculos', id);
            appData.veiculos = appData.veiculos.filter(v => v.id !== id);
            loadVeiculos(); 
            updateDashboard();
        } catch (error) {
            console.error("Erro ao excluir veículo:", error);
            alert("Erro ao excluir veículo.");
        }
    }
}

function loadClientesSelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Selecione o cliente</option>';
    appData.clientes.forEach(c => { 
        select.innerHTML += `<option value="${c.id}">${c.nome}</option>`; 
    });
}

function loadVeiculosByCliente() {
    const clienteId = document.getElementById('osCliente').value;
    const select = document.getElementById('osVeiculo');
    select.innerHTML = '<option value="">Selecione o veículo</option>';
    if (clienteId) {
        appData.veiculos.filter(v => v.clienteId === clienteId).forEach(v => {
            select.innerHTML += `<option value="${v.id}">${v.placa} - ${v.marca} ${v.modelo}</option>`;
        });
    }
}

// ==========================================
// 9. ORDENS DE SERVIÇO
// ==========================================
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

    const resultados = appData.ordens.filter(o => {
        const cliente = appData.clientes.find(c => c.id === o.clienteId);
        const veiculo = appData.veiculos.find(v => v.id === o.veiculoId);
        const correspondePlaca = !placa || normalizarConsulta(veiculo ? veiculo.placa : '').includes(placa);
        const correspondeCliente = !clienteNome || normalizarConsulta(cliente ? cliente.nome : '').includes(clienteNome);
        return correspondePlaca && correspondeCliente;
    });

    resumo.textContent = resultados.length === 1 
        ? '1 ordem de serviço encontrada.' 
        : `${resultados.length} ordens de serviço encontradas.`;
    tbody.innerHTML = '';

    resultados.forEach(o => {
        const cliente = appData.clientes.find(c => c.id === o.clienteId);
        const veiculo = appData.veiculos.find(v => v.id === o.veiculoId);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${o.numero}</td><td>${cliente ? cliente.nome : '-'}</td><td>${veiculo ? veiculo.placa : '-'}</td>
        <td><span class="status-badge status-${o.status}">${getStatusLabel(o.status)}</span></td>
        <td><button class="btn-icon view" title="Visualizar OS" onclick="visualizarOSDaConsulta('${o.id}')"><i class="fas fa-eye"></i></button></td>`;
        tbody.appendChild(tr);
    });
}

function limparConsultaOS() {
    document.getElementById('consultaPlaca').value = '';
    document.getElementById('consultaCliente').value = '';
    consultarOS();
    document.getElementById('consultaPlaca').focus();
}

function visualizarOSDaConsulta(id) { 
    closeModal('consultaOSModal'); 
    viewOS(id); 
}

function loadOrdens() {
    const tbody = document.getElementById('ordensTable');
    tbody.innerHTML = '';
    appData.ordens.forEach(o => {
        const cliente = appData.clientes.find(c => c.id === o.clienteId);
        const veiculo = appData.veiculos.find(v => v.id === o.veiculoId);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${o.numero}</td><td>${cliente ? cliente.nome : '-'}</td><td>${veiculo ? `${veiculo.placa} - ${veiculo.marca}` : '-'}</td>
        <td>${formatDate(o.dataEntrada)}</td><td>${formatCurrency(o.valorTotal)}</td>
        <td><span class="status-badge status-${o.status}">${getStatusLabel(o.status)}</span></td>
        <td><button class="btn-icon view" onclick="viewOS('${o.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn-icon edit" onclick="editOS('${o.id}')"><i class="fas fa-edit"></i></button>
        ${currentUser.tipo === 'admin' ? `<button class="btn-icon delete" onclick="deleteOS('${o.id}')"><i class="fas fa-trash"></i></button>` : ''}</td>`;
        tbody.appendChild(tr);
    });
}

async function saveOS(e) {
    e.preventDefault();
    const id = document.getElementById('osId').value;
    const servicos = [];
    document.querySelectorAll('#servicosBody tr').forEach(row => {
        servicos.push({
            tipo: row.querySelector('.serv-tipo').value, 
            descricao: row.querySelector('.serv-desc').value,
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
        numero: document.getElementById('osNumero').value, 
        dataEntrada: document.getElementById('osDataEntrada').value,
        dataPrevisao: document.getElementById('osDataPrevisao').value, 
        status: document.getElementById('osStatus').value,
        clienteId: document.getElementById('osCliente').value, 
        veiculoId: document.getElementById('osVeiculo').value,
        descricao: document.getElementById('osDescricao').value, 
        servicos, 
        totalPecas, 
        totalMaoObra, 
        valorTotal: totalPecas + totalMaoObra
    };
    
    try {
        const newId = await saveDocument('ordens', data, id || undefined);

        if (id) {
            const idx = appData.ordens.findIndex(o => o.id === id);
            appData.ordens[idx] = { id, ...data };
        } else {
            appData.ordens.push({ id: newId, ...data });
        }
        
        closeModal('osModal'); 
        loadOrdens(); 
        updateDashboard();
    } catch (error) {
        console.error("Erro ao salvar OS:", error);
        alert("Erro ao salvar ordem de serviço.");
    }
}

function editOS(id) {
    if (currentUser.tipo !== 'admin') { 
        alert('Apenas administradores podem editar ordens de serviço.'); 
        return; 
    }
    editingOS = true;
    const o = appData.ordens.find(or => or.id === id);
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

async function deleteOS(id) {
    if (currentUser.tipo !== 'admin') { 
        alert('Apenas administradores podem excluir ordens de serviço.'); 
        return; 
    }
    if (confirm('Deseja realmente excluir esta ordem de serviço?')) {
        try {
            await deleteDocument('ordens', id);
            appData.ordens = appData.ordens.filter(o => o.id !== id);
            loadOrdens(); 
            updateDashboard();
        } catch (error) {
            console.error("Erro ao excluir OS:", error);
            alert("Erro ao excluir ordem de serviço.");
        }
    }
}

function viewOS(id) {
    const o = appData.ordens.find(or => or.id === id);
    const cliente = appData.clientes.find(c => c.id === o.clienteId);
    const veiculo = appData.veiculos.find(v => v.id === o.veiculoId);
    let servicosHTML = '';
    o.servicos.forEach((s, i) => {
        servicosHTML += `<tr><td>${i + 1}</td><td>${s.tipo}</td><td>${s.descricao}</td><td>${s.qtdPecas}</td>
        <td>${formatCurrency(s.valorPecaUnit)}</td><td>${formatCurrency(s.valorPecas)}</td>
        <td>${formatCurrency(s.maoObra)}</td><td>${formatCurrency(s.subtotal)}</td></tr>`;
    });
    document.getElementById('osPrintContent').innerHTML = `
        <div class="os-print-header">
            <h2>${appData.dadosOficina.nome}</h2><p>${appData.dadosOficina.endereco}</p>
            <p>Tel: ${appData.dadosOficina.telefone} | Email: ${appData.dadosOficina.email}</p>
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

function printOS() { 
    window.print(); 
}

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

// ==========================================
// 10. USUÁRIOS E DADOS DA OFICINA
// ==========================================
function loadUsuarios() {
    const tbody = document.getElementById('usuariosTable');
    tbody.innerHTML = '';
    appData.usuarios.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${u.nome}</td><td>${u.login}</td><td>${u.tipo === 'admin' ? 'Administrador' : 'Usuário'}</td>
        <td><span class="status-badge status-${u.status === 'ativo' ? 'concluida' : 'cancelada'}">${u.status}</span></td>
        <td><button class="btn-icon edit" onclick="editUsuario('${u.id}')"><i class="fas fa-edit"></i></button>
        ${u.login !== 'admin@lourenco.com' ? `<button class="btn-icon delete" onclick="deleteUsuario('${u.id}')"><i class="fas fa-trash"></i></button>` : ''}</td>`;
        tbody.appendChild(tr);
    });
}

async function saveUsuario(e) {
    e.preventDefault();
    const id = document.getElementById('usuarioId').value;
    const data = { 
        nome: document.getElementById('usuarioNome').value, 
        login: document.getElementById('usuarioLogin').value, // Este será o email no Firebase Auth
        senha: document.getElementById('usuarioSenha').value, 
        tipo: document.getElementById('usuarioTipo').value, 
        status: document.getElementById('usuarioStatus').value 
    };
    
    try {
        const newId = await saveDocument('usuarios', data, id || undefined);

        if (id) {
            const idx = appData.usuarios.findIndex(u => u.id === id);
            appData.usuarios[idx] = { id, ...data };
        } else {
            appData.usuarios.push({ id: newId, ...data });
        }
        
        closeModal('usuarioModal'); 
        loadUsuarios();
        alert("Usuário salvo no sistema! ️ Não esqueça de criar a conta no Firebase Authentication com o email: " + data.login);
    } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        alert("Erro ao salvar usuário.");
    }
}

function editUsuario(id) {
    const u = appData.usuarios.find(us => us.id === id);
    document.getElementById('usuarioId').value = u.id;
    document.getElementById('usuarioNome').value = u.nome;
    document.getElementById('usuarioLogin').value = u.login;
    document.getElementById('usuarioSenha').value = u.senha;
    document.getElementById('usuarioTipo').value = u.tipo;
    document.getElementById('usuarioStatus').value = u.status;
    document.getElementById('usuarioModalTitle').textContent = 'Editar Usuário';
    openModal('usuarioModal');
}

async function deleteUsuario(id) {
    if (confirm('Deseja realmente excluir este usuário?')) {
        try {
            await deleteDocument('usuarios', id);
            appData.usuarios = appData.usuarios.filter(u => u.id !== id);
            loadUsuarios();
        } catch (error) {
            console.error("Erro ao excluir usuário:", error);
            alert("Erro ao excluir usuário.");
        }
    }
}

function loadDadosOficina() {
    document.getElementById('oficinaNome').value = appData.dadosOficina.nome || '';
    document.getElementById('oficinaCnpj').value = appData.dadosOficina.cnpj || '';
    document.getElementById('oficinaEndereco').value = appData.dadosOficina.endereco || '';
    document.getElementById('oficinaTelefone').value = appData.dadosOficina.telefone || '';
    document.getElementById('oficinaEmail').value = appData.dadosOficina.email || '';
}

async function saveDadosOficina(e) {
    e.preventDefault();
    const data = {
        nome: document.getElementById('oficinaNome').value, 
        cnpj: document.getElementById('oficinaCnpj').value,
        endereco: document.getElementById('oficinaEndereco').value, 
        telefone: document.getElementById('oficinaTelefone').value,
        email: document.getElementById('oficinaEmail').value
    };
    
    try {
        await saveDocument('dadosOficina', data, appData.dadosOficina.id);
        appData.dadosOficina = { ...appData.dadosOficina, ...data };
        alert('Dados da oficina salvos com sucesso!');
    } catch (error) {
        console.error("Erro ao salvar dados da oficina:", error);
        alert("Erro ao salvar dados da oficina.");
    }
}

// ==========================================
// 11. FATURAMENTO E EXPORTAÇÃO
// ==========================================
function updateFaturamento() {
    const periodo = document.getElementById('faturamentoPeriodo').value;
    const mes = document.getElementById('faturamentoMes').value;
    const ano = parseInt(document.getElementById('faturamentoAno').value);
    let filtered = appData.ordens.filter(o => o.status === 'concluida');
    if (periodo === 'mensal' && mes) { 
        filtered = filtered.filter(o => o.dataEntrada.startsWith(mes)); 
    } else if (periodo === 'anual') { 
        filtered = filtered.filter(o => o.dataEntrada.startsWith(ano.toString())); 
    }
    
    const totalPecas = filtered.reduce((sum, o) => sum + (o.totalPecas || 0), 0);
    const totalMaoObra = filtered.reduce((sum, o) => sum + (o.totalMaoObra || 0), 0);
    document.getElementById('fatTotal').textContent = formatCurrency(totalPecas + totalMaoObra);
    document.getElementById('fatMaoObra').textContent = formatCurrency(totalMaoObra);
    document.getElementById('fatPecas').textContent = formatCurrency(totalPecas);
    document.getElementById('fatOrdens').textContent = filtered.length;
}

function escapeHTML(valor) { 
    return String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); 
}

function dadosOrdensExportacao() { 
    return appData.ordens.map(o => { 
        const c = appData.clientes.find(x => x.id === o.clienteId); 
        const v = appData.veiculos.find(x => x.id === o.veiculoId); 
        return [o.numero, c ? c.nome : '-', c ? c.cpf : '-', v ? v.placa : '-', v ? `${v.marca} ${v.modelo}` : '-', formatDate(o.dataEntrada), getStatusLabel(o.status), o.totalPecas || 0, o.totalMaoObra || 0, o.valorTotal || 0]; 
    }); 
}

function dadosFaturamentoExportacao() { 
    return appData.ordens.filter(o => o.status === 'concluida').map(o => { 
        const c = appData.clientes.find(x => x.id === o.clienteId); 
        const v = appData.veiculos.find(x => x.id === o.veiculoId); 
        return [o.numero, formatDate(o.dataEntrada), c ? c.nome : '-', v ? v.placa : '-', o.totalPecas || 0, o.totalMaoObra || 0, o.valorTotal || 0]; 
    }); 
}

function baixarExcel(nomeArquivo, titulo, cabecalhos, linhas) {
    const tabela = `<table><thead><tr>${cabecalhos.map(c => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map(v => `<td>${escapeHTML(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const blob = new Blob(['\ufeff', `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><h2>${escapeHTML(titulo)}</h2>${tabela}</body></html>`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(blob); 
    link.download = `${nomeArquivo}.xls`; 
    document.body.appendChild(link); 
    link.click(); 
    link.remove();
}

function exportarOrdensExcel() { 
    baixarExcel('ordens-de-servico', 'Relatório de OS', ['Nº OS', 'Cliente', 'CPF', 'Placa', 'Veículo', 'Data', 'Status', 'Peças', 'Mão de Obra', 'Total'], dadosOrdensExportacao()); 
}

function exportarFaturamentoExcel() { 
    baixarExcel('faturamento', 'Relatório de Faturamento', ['Nº OS', 'Data', 'Cliente', 'Placa', 'Peças', 'Mão de Obra', 'Total'], dadosFaturamentoExportacao()); 
}

function abrirRelatorioPDF(titulo, cabecalhos, linhas, resumo = '') {
    const janela = window.open('', '_blank');
    if (!janela) return alert('Permita a abertura de janelas para gerar o PDF.');
    const tabela = `<table><thead><tr>${cabecalhos.map(c => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map(v => `<td>${escapeHTML(typeof v === 'number' ? formatCurrency(v) : v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    janela.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHTML(titulo)}</title><style>body{font-family:Arial,sans-serif;color:#222;margin:28px}h1{color:#1a3a5c}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}th,td{border:1px solid #bbb;padding:8px;text-align:left}th{background:#eef3f8}</style></head><body><h1>${escapeHTML(appData.dadosOficina.nome)}</h1><p>${escapeHTML(titulo)} · ${new Date().toLocaleDateString('pt-BR')}</p>${resumo}${tabela}<script>window.onload=function(){window.print();};<\/script></body></html>`);
    janela.document.close();
}

function exportarOrdensPDF() { 
    abrirRelatorioPDF('Relatório de OS', ['Nº OS', 'Cliente', 'Placa', 'Data', 'Status', 'Peças', 'Mão de Obra', 'Total'], dadosOrdensExportacao().map(l => [l[0], l[1], l[3], l[5], l[6], l[7], l[8], l[9]])); 
}

function exportarFaturamentoPDF() {
    const linhas = dadosFaturamentoExportacao();
    const resumo = `<p><strong>OS concluídas:</strong> ${linhas.length} | <strong>Peças:</strong> ${formatCurrency(linhas.reduce((t, l) => t + l[4], 0))} | <strong>Mão de obra:</strong> ${formatCurrency(linhas.reduce((t, l) => t + l[5], 0))} | <strong>Total:</strong> ${formatCurrency(linhas.reduce((t, l) => t + l[6], 0))}</p>`;
    abrirRelatorioPDF('Relatório de Faturamento', ['Nº OS', 'Data', 'Cliente', 'Placa', 'Peças', 'Mão de Obra', 'Total'], linhas, resumo);
}

// ==========================================
// 12. IMPORTAR E DASHBOARD
// ==========================================
async function importExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const lines = e.target.result.split('\n');
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 7) {
                const nomeCliente = cols[0].trim(), cpfCliente = cols[1].trim(), placa = cols[2].trim();
                const tipoServico = cols[3].trim(), valorPecas = parseFloat(cols[4]) || 0, valorMaoObra = parseFloat(cols[5]) || 0, dataServico = cols[6].trim();
                
                let cliente = appData.clientes.find(c => c.cpf === cpfCliente);
                if (!cliente) { 
                    const newCid = await saveDocument('clientes', { nome: nomeCliente, cpf: cpfCliente, telefone: '', email: '' });
                    cliente = { id: newCid, nome: nomeCliente, cpf: cpfCliente, telefone: '', email: '' }; 
                    appData.clientes.push(cliente); 
                }
                
                let veiculo = appData.veiculos.find(v => v.placa === placa && v.clienteId === cliente.id);
                if (!veiculo) { 
                    const newVid = await saveDocument('veiculos', { placa, marca: 'Importado', modelo: '', ano: '2020', cor: '', clienteId: cliente.id });
                    veiculo = { id: newVid, placa, marca: 'Importado', modelo: '', ano: '2020', cor: '', clienteId: cliente.id }; 
                    appData.veiculos.push(veiculo); 
                }
                
                const nextNum = appData.ordens.length + 1;
                const osData = {
                    numero: `OS-${String(nextNum).padStart(4, '0')}`,
                    dataEntrada: dataServico, status: 'concluida', clienteId: cliente.id, veiculoId: veiculo.id,
                    servicos: [{ tipo: tipoServico, descricao: tipoServico, qtdPecas: 1, valorPecaUnit: valorPecas, valorPecas, maoObra: valorMaoObra, subtotal: valorPecas + valorMaoObra }],
                    totalPecas: valorPecas, totalMaoObra: valorMaoObra, valorTotal: valorPecas + valorMaoObra
                };
                const newOid = await saveDocument('ordens', osData);
                appData.ordens.push({ id: newOid, ...osData });
                imported++;
            }
        }
        alert(`${imported} serviços importados com sucesso!`);
        updateDashboard();
    };
    reader.readAsText(file);
}

function updateDashboard() {
    document.getElementById('statClientes').textContent = appData.clientes.length;
    document.getElementById('statVeiculos').textContent = appData.veiculos.length;
    document.getElementById('statOrdens').textContent = appData.ordens.length;
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const fatMensal = appData.ordens.filter(o => o.status === 'concluida' && o.dataEntrada.startsWith(mesAtual)).reduce((sum, o) => sum + (o.valorTotal || 0), 0);
    document.getElementById('statFaturamento').textContent = formatCurrency(fatMensal);
    
    const tbody = document.getElementById('recentOrdersTable');
    tbody.innerHTML = '';
    const recent = [...appData.ordens].sort((a, b) => new Date(b.dataEntrada) - new Date(a.dataEntrada)).slice(0, 5);
    recent.forEach(o => {
        const cliente = appData.clientes.find(c => c.id === o.clienteId);
        const veiculo = appData.veiculos.find(v => v.id === o.veiculoId);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${o.numero}</td><td>${cliente ? cliente.nome : '-'}</td><td>${veiculo ? `${veiculo.placa} - ${veiculo.marca}` : '-'}</td>
        <td>${formatDate(o.dataEntrada)}</td><td>${formatCurrency(o.valorTotal)}</td>
        <td><span class="status-badge status-${o.status}">${getStatusLabel(o.status)}</span></td>`;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 13. UTILITÁRIOS E BACKUP
// ==========================================
function formatCurrency(value) { 
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); 
}

function formatDate(date) { 
    if (!date) return '-'; 
    const [y, m, d] = date.split('-'); 
    return `${d}/${m}/${y}`; 
}

function getStatusLabel(status) { 
    return { 'aberta': 'Aberta', 'andamento': 'Em Andamento', 'concluida': 'Concluída', 'cancelada': 'Cancelada' }[status] || status; 
}

function fazerBackup() {
    const dados = JSON.stringify(appData);
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `backup-auto-mecanica-nuvem-${dataAtual}.json`;
    const blob = new Blob([dados], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; 
    link.download = nomeArquivo;
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link); 
    URL.revokeObjectURL(url);
    alert(`✅ Backup realizado com sucesso!\n\nArquivo: ${nomeArquivo}\n\nGUARDE ESTE ARQUIVO EM LOCAL SEGURO!`);
}

async function restaurarBackup(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (!dados.clientes || !dados.veiculos || !dados.ordens) { 
                alert('❌ Arquivo de backup inválido!'); 
                return; 
            }
            if (confirm(`⚠️ ATENÇÃO!\n\nIsso substituirá TODOS os dados atuais no banco de dados pelos dados do backup.\n\nDeseja continuar?`)) {
                for (const c of dados.clientes) await saveDocument('clientes', c, c.id);
                for (const v of dados.veiculos) await saveDocument('veiculos', v, v.id);
                for (const o of dados.ordens) await saveDocument('ordens', o, o.id);
                if (dados.dadosOficina && dados.dadosOficina.id) {
                    await saveDocument('dadosOficina', dados.dadosOficina, dados.dadosOficina.id);
                }
                
                alert('✅ Backup restaurado com sucesso na nuvem!\n\nA página será recarregada.');
                location.reload();
            }
        } catch (erro) { 
            alert('❌ Erro ao ler arquivo de backup: ' + erro.message); 
        }
    };
    reader.readAsText(arquivo);
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) { 
        e.target.classList.remove('active'); 
    }
});

// ==========================================
// 14. EXPOSIÇÃO DE FUNÇÕES GLOBAIS (PARA O HTML)
// ==========================================
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.openModal = openModal;
window.closeModal = closeModal;
window.openAlterarSenhaModal = openAlterarSenhaModal;
window.alterarSenha = alterarSenha;
window.toggleBusca = toggleBusca;
window.loadClientes = loadClientes;
window.saveCliente = saveCliente;
window.editCliente = editCliente;
window.deleteCliente = deleteCliente;
window.loadVeiculos = loadVeiculos;
window.saveVeiculo = saveVeiculo;
window.editVeiculo = editVeiculo;
window.deleteVeiculo = deleteVeiculo;
window.loadClientesSelect = loadClientesSelect;
window.loadVeiculosByCliente = loadVeiculosByCliente;
window.openConsultaOS = openConsultaOS;
window.consultarOS = consultarOS;
window.limparConsultaOS = limparConsultaOS;
window.visualizarOSDaConsulta = visualizarOSDaConsulta;
window.loadOrdens = loadOrdens;
window.saveOS = saveOS;
window.editOS = editOS;
window.deleteOS = deleteOS;
window.viewOS = viewOS;
window.printOS = printOS;
window.addServicoRow = addServicoRow;
window.calcServicoRow = calcServicoRow;
window.updateOSTotals = updateOSTotals;
window.loadUsuarios = loadUsuarios;
window.saveUsuario = saveUsuario;
window.editUsuario = editUsuario;
window.deleteUsuario = deleteUsuario;
window.loadDadosOficina = loadDadosOficina;
window.saveDadosOficina = saveDadosOficina;
window.updateFaturamento = updateFaturamento;
window.exportarOrdensExcel = exportarOrdensExcel;
window.exportarFaturamentoExcel = exportarFaturamentoExcel;
window.exportarOrdensPDF = exportarOrdensPDF;
window.exportarFaturamentoPDF = exportarFaturamentoPDF;
window.importExcel = importExcel;
window.updateDashboard = updateDashboard;
window.fazerBackup = fazerBackup;
window.restaurarBackup = restaurarBackup;
window.togglePassword = togglePassword;
window.logout = logout;
window.showForgotPassword = showForgotPassword;
