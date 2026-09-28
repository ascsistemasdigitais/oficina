markdown# Sistema de Gestão para Oficina Mecânica - Java + Firestore

Sistema completo para controle de oficina mecânica, focado em rastreabilidade e faturamento. Desenvolvido em Java com arquitetura de dados NoSQL no Firebase Firestore.

### 🔧 Funcionalidades

**1. Ordem de Serviço (OS) Inteligente**
- Numeração automática sequencial e sem repetição (ex: OS-2026-0001)
- Status: Aberta, Em Andamento, Aguardando Peça, Finalizada, Entregue
- Vínculo total: Cliente > Veículo > OS > Peças > Serviços

**2. Cadastros**
- **Clientes:** CPF/CNPJ, telefone, histórico completo de OS
- **Veículos:** Placa, modelo, KM, chassi, vinculado automaticamente ao cliente dono
- **Peças e Serviços:** Cadastro com valor de custo, valor de venda e margem

**3. Financeiro e Faturamento**
- Cálculo automático: Mão de obra + Peças
- Faturamento por período, por cliente e por mecânico
- Relatórios de OS abertas vs. faturadas

**4. Consultas e Tabelas**
- Busca rápida por Placa, Nome do Cliente ou Nº da OS
- Tabelas dinâmicas com filtros de data, status e cliente
- Histórico completo do veículo: tudo que já foi feito nele

**5. Auditoria e Segurança [Diferencial de Arquiteto]**
- Log de Acesso completo: toda OS, cadastro de cliente ou veículo registra `usuarioId`, `data/hora` e `ação`
- Coleção `logs_auditoria` para rastrear quem digitou, editou ou excluiu qualquer registro
- Controle de permissão por nível de usuário

### 🏛️ Arquitetura de Dados - Firestore

Estrutura pensada para não duplicar dados e manter histórico:

- `clientes` { id, nome, telefone... }
- `veiculos` { id, placa, modelo, clienteId } -> vínculo obrigatório
- `ordens_servico` { id: OS-2026-0001, clienteId, veiculoId, status, valorTotal, criadoPor }
- `os_itens` { osId, tipo: peca/servico, descricao, valor }
- `logs_auditoria` { usuarioId, acao: criou_os/editou_cliente, colecaoAfetada, timestamp }

Padrão usado: **Modelagem por referência + Log de eventos para auditoria**

### 🛠️ Tecnologias

- **Backend:** Java + Firebase Admin SDK
- **Banco:** Google Firestore
- **Frontend:** HTML5, CSS3, JavaScript
- **Autenticação:** Firebase Auth + controle de usuário logado

### 📈 Como funciona a numeração automática

Utiliza `Transaction` no Firestore em um documento `contadores/os` para garantir que mesmo com 2 usuários criando OS ao mesmo tempo, a numeração nunca duplique.

---
Desenvolvido por Alexandre Silva da Costa | Eng. da Computação - 2029
Foco: Evolução para Arquitetura de Dados e Sistemas Web
