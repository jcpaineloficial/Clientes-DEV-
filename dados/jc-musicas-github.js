/*
  JC-APK TV — Playlist do player de música
  Regra oficial: músicas ficam no GitHub Releases, não no Supabase e não em pasta local do painel.

  Release oficial conferida:
  https://github.com/JoaoJMuniz19/JC-APK-TV-Midias/releases/tag/musicas-oficiais

  Observação:
  - O player lê apenas este arquivo JS e toca URLs diretas do GitHub Releases.
  - Não consulta Supabase.
  - Não grava MP3 no banco.
  - Os fallbackSunoId foram mantidos apenas como segurança caso algum asset mude de nome ou falhe.
*/
(function(){
  var releaseBase = 'https://github.com/JoaoJMuniz19/JC-APK-TV-Midias/releases/download/musicas-oficiais/';

  function releaseAsset(name){
    return releaseBase + encodeURIComponent(name);
  }

  window.JC_GITHUB_MUSIC_CONFIG = {
    enabled: true,
    defaultVolume: 5,
    playbackMode: 'sequence',
    repeatMode: 'list',
    startOnFirstInteraction: true,
    useSupabaseConfig: false,
    showFloatingPlayer: true,
    showPagePlayer: true,
    storagePrefix: 'jc_github_music_',
    githubRelease: {
      owner: 'JoaoJMuniz19',
      repo: 'JC-APK-TV-Midias',
      tag: 'musicas-oficiais'
    },
    playlist: [
      {
        title: 'Acredite em seus sonhos',
        src: releaseAsset('acredite-em-seus-sonhos.mp3'),
        fallbackSunoId: '1704551b-3723-4733-aea2-f487f675e3b7'
      },
      {
        title: 'Painel Virou Caminho',
        src: releaseAsset('painel-virou-caminho.mp3'),
        fallbackSunoId: '48b9c569-a5ce-420d-8410-720178ba0230'
      },
      {
        title: 'Foi Deus Quem Me Sustentou',
        src: releaseAsset('foi-deus-quem-me-sustentou.mp3'),
        fallbackSunoId: '5f815130-00a9-4527-ba9e-77010bf8ab50'
      },
      {
        title: 'Foi Deus Quem Me Sustentou 2',
        src: releaseAsset('foi-deus-quem-me-sustentou-2.mp3'),
        fallbackSunoId: 'cc8d5494-8c05-4667-b8ef-815ea581c2b2'
      },
      {
        title: 'Senhor',
        src: releaseAsset('senhor.mp3'),
        fallbackSunoId: 'e3dfa5cf-ae11-4ded-88b4-c23cfaf6ac3b'
      },
      {
        title: 'Senhor 2',
        src: releaseAsset('senhor-2.mp3'),
        fallbackSunoId: '0128b887-a7a2-446e-87b4-c6c8d398799f'
      }
    ]
  };
})();
