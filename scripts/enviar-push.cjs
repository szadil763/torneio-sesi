#!/usr/bin/env node
/**
 * Enviar notificações push para pais/alunos — Torneio SESI
 *
 * Uso:
 *   node scripts/enviar-push.cjs "Título" "Mensagem"
 *
 * Pré-requisito (instalar uma vez):
 *   npm install web-push   (ou npx web-push)
 *
 * Configuração (preencher as constantes abaixo):
 *   1. VAPID_PUBLIC_KEY  — Firebase Console → Configurações → Cloud Messaging → Certificados Web Push
 *   2. VAPID_PRIVATE_KEY — mesmo lugar (clique em "Mostrar")
 *   3. VAPID_EMAIL       — seu e-mail (para identificação no push service)
 *
 * O script lê os tokens em /fcm-tokens no Firebase RTDB e envia uma
 * notificação Web Push para cada dispositivo inscrito.
 */

'use strict';
const webpush = require('web-push');
const https   = require('https');

// ── CONFIGURE AQUI ────────────────────────────────────────────────
const VAPID_PUBLIC_KEY  = 'COLE_A_VAPID_KEY_PUBLICA_AQUI';
const VAPID_PRIVATE_KEY = 'COLE_A_VAPID_KEY_PRIVADA_AQUI';
const VAPID_EMAIL       = 'mailto:szadil763@gmail.com';
const RTDB_URL          = 'https://torneio-sesi-20de0-default-rtdb.firebaseio.com';
// ─────────────────────────────────────────────────────────────────

if (VAPID_PUBLIC_KEY.startsWith('COLE')) {
  console.error('⚠  Preencha VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no topo do script.');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const titulo  = process.argv[2] || 'Torneio SESI';
const mensagem = process.argv[3] || 'Novo comunicado disponível!';

function rtdbGet(path) {
  return new Promise((resolve, reject) => {
    https.get(`${RTDB_URL}${path}.json`, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log(`\n📢 Enviando push: "${titulo}" — ${mensagem}\n`);

  const tokens = await rtdbGet('/fcm-tokens');
  if (!tokens || typeof tokens !== 'object') {
    console.log('⚠  Nenhum dispositivo inscrito. Aguarde os pais ativarem notificações.');
    return;
  }

  const entradas = Object.entries(tokens);
  console.log(`📱 ${entradas.length} dispositivo(s) inscrito(s)\n`);

  const payload = JSON.stringify({
    notification: { title: titulo, body: mensagem, icon: '/torneio-sesi.jpg' },
    url: '/insignias/comunicados.html',
  });

  let ok = 0, err = 0;
  for (const [uuid, sub] of entradas) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        { TTL: 86400 }
      );
      console.log(`  ✅ ${uuid.slice(0, 8)}…`);
      ok++;
    } catch (e) {
      console.log(`  ⚠  ${uuid.slice(0, 8)}… — ${e.statusCode || e.message}`);
      // Remove tokens expirados (status 410 = gone, 404 = not found)
      if (e.statusCode === 410 || e.statusCode === 404) {
        https.request(`${RTDB_URL}/fcm-tokens/${uuid}.json`, { method: 'DELETE' }, () => {}).end();
        console.log(`       (token removido — expirado)`);
      }
      err++;
    }
  }

  console.log(`\n🏁 Resultado: ${ok} enviado(s), ${err} erro(s)\n`);
}

main().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
