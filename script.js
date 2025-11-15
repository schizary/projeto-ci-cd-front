// script.js - ATUALIZE COM SUA URL
const BACKEND_URL = 'https://projeto-ci-cd-back-k57p.onrender.com';

async function chamarAPI() {
    const saida = document.getElementById('saida');
    const botao = document.getElementById('botaoTeste');
    
    try {
        saida.className = '';
        saida.innerHTML = '<span class="loading">🔄 Conectando com o back-end...</span>';
        botao.disabled = true;
        
        const resposta = await fetch(BACKEND_URL);
        
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }
        
        const dados = await resposta.json();
        saida.className = 'success';
        saida.innerHTML = `✅ <strong>Sucesso!</strong><br>${dados.mensagem}<br><small>Versão: ${dados.versao}</small><br><small>Horário: ${new Date(dados.timestamp).toLocaleTimeString()}</small>`;
        
    } catch (erro) {
        console.error('Erro:', erro);
        saida.className = 'error';
        saida.innerHTML = `❌ <strong>Erro na conexão</strong><br>${erro.message}<br><small>Verifique se o back-end está online</small>`;
    } finally {
        botao.disabled = false;
    }
}

// Teste automático ao carregar a página
window.addEventListener('load', chamarAPI);