# npm yayın rehberi

Paket kimliği **`@yartasdev/pwa`**, CLI komutu **`pwa`**, ilk sürüm **`0.1.0`** olarak hazırlanmıştır. Bu hazırlık sırasında yayın yapılmadı.

## Yerel kontroller

```sh
npm ci
npm run format:check
npm run release:check
npm run pack:dry-run
```

`release:check`, kaynak biçimini ve tipleri doğrular, görsel/CLI testlerini çalıştırır, arşiv içeriğini inceler ve arşivi ayrı bir tüketici projesine kurar. ESM, CommonJS, tip çözümlemesi ve kurulan CLI kontrol edilir. Bu komutlar yayın yapmaz; test kurulumu bağımlılık indirmek için registry'yi okuyabilir.

Gerçek yerel arşiv için `npm pack` çalıştır. Oluşan `yartasdev-pwa-0.1.0.tgz` dosyasını başka bir projeye kurabilirsin:

```sh
npm install /gercek/yol/yartasdev-pwa-0.1.0.tgz
```

`pack:check` teknik paket doğrulamasıdır; npm hesabının scope üzerindeki yetkisini kontrol etmez. `@yartasdev` scope'una sahip hesap veya organizasyonla yayın yapmalısın.

## Paket ayarları

- `publishConfig.registry`: `https://registry.npmjs.org/`.
- `publishConfig.access`: `public`.
- `publishConfig.tag`: `latest`. Ön sürümler için bilinçli olarak `next` gibi ayrı bir tag seç.
- `files`: derlenmiş ESM/CommonJS, kaynak haritaları için `src`, örnekler, README, changelog, lisans ve bu rehber.
- `.npmrc`: registry ve lockfile ayarları; token içermez.
- `prepublishOnly`: yayın başlatıldığında önce `release:check` çalıştırır.
- ISC lisansı ve hak sahibi: `yartasdev`.

`files` izin listesi kullanıldığı için ayrıca `.npmignore` tutulmaz. Paket kontrolü `.env`, `.npmrc`, `.tmp`, `.github`, testler ve `node_modules` gibi geliştirme/kimlik dosyalarının arşive girmediğini doğrular.

Manifest ve HTML uygulama çıktılarıdır; npm metadata'sından bağımsızdır. Varsayılan üretim yalnızca 55 görseldir. Config'te `manifest: true` veya manifest nesnesi, `html: true` eklenirse `manifest.webmanifest` ve `index.html` de oluşur. Örnek config ikisini de açıkça etkinleştirir.

## GitHub repository oluşturulduğunda

Henüz repository olmadığı için `repository`, `homepage` ve `bugs` alanlarına hayali URL yazılmadı. Depoyu oluşturunca aşağıdaki `YOUR_REPOSITORY` ve gerekiyorsa hesap kısmını gerçek bilgilerle değiştir:

```sh
npm pkg set "repository.type=git" "repository.url=git+https://github.com/yartasdev/YOUR_REPOSITORY.git"
npm pkg set "homepage=https://github.com/yartasdev/YOUR_REPOSITORY#readme"
npm pkg set "bugs.url=https://github.com/yartasdev/YOUR_REPOSITORY/issues"
npm install --package-lock-only
npm run format
```

GitHub kullanıcı adı npm scope'undan farklıysa repository URL'sinde gerçek GitHub hesabını kullan. CI'daki sürüm hazırlığı, gerçek `GITHUB_REPOSITORY` bilgisinden bu alanları yayın paketine otomatik olarak da ekler. Kaynak depodaki bağlantıları güncel tutmak için yukarıdaki metadata'yı yine tamamlayabilirsin. Git deposunu oluşturma, remote ekleme ve push işlemleri bu hazırlığın parçası olarak çalıştırılmadı.

## CI

`.github/workflows/ci.yml`, `main` dışındaki branch push'larında, `main` hedefli pull request'lerde ve manuel çalıştırmada Node.js 22 ve 24 ile Windows/Linux matrisinde `release:check` çalıştırır. Yayın adımı içermez. `main` push'larında aynı kontroller `.github/workflows/release.yml` içinde çalışır; böylece iki ayrı CI matrisi tekrarlanmaz.

Biçimlendirme `.prettierrc.json` ve `.editorconfig` ile tanımlanır:

```sh
npm run format
npm run format:check
```

## Manuel yerel yayın

Hazır olduğunda kendi hesabınla `npm login`, `npm whoami` ve `npm view @yartasdev/pwa versions --json` ile hesabı/sürümleri kontrol et. Yeni paket için 404 dönebilir; ağ veya yetki hatalarını isim uygunluğu olarak yorumlama. Yayın için npm hesabının istediği 2FA yöntemini tamamla ve tokenları depoya ekleme.

`CHANGELOG.md` içindeki `Unreleased` başlığını yayın günü tarihle güncelle. Aynı ad/sürüm ikilisi tekrar yayımlanamaz; sonraki sürümlerde sürüm numarasını ve lockfile'ı birlikte güncelle. `npm version patch` Git deposunda commit/tag de oluşturabilir; bunu kendi release akışına göre seç.

**Aşağıdaki komut gerçek yayın yapar; hazırlık sırasında çalıştırılmaz:**

```sh
npm publish --access public
```

## main üzerinde otomatik CI/CD

`.github/workflows/release.yml`, `main` branch'ine her push'ta otomatik çalışır. İstersen `main` üzerinden `workflow_dispatch` ile de yeniden başlatabilirsin. Manuel çalıştırmada sürüm girilmez. Önceki `NPM_PUBLISH_ENABLED` kapısı kaldırıldı; yayın için değişken açmak gerekmez.

Akış:

1. Push edilen commit, Node.js 22/24 ve Windows/Linux matrisinde doğrulanır. Bir kontrol bile başarısızsa yayın işi çalışmaz.
2. Yayın işi npm registry'den mevcut sürümleri ve kaynak commit SHA'larını okur.
3. Aynı commit daha önce yayımlanmışsa yayın atlanır. Registry erişim, yetki veya veri hataları yeni paket olarak yorumlanmaz; işlem durur.
4. İlk yayında `package.json.version` kullanılır. Sonrakilerde npm'deki en yüksek kararlı sürümün patch değeri artırılır: `0.1.0 → 0.1.1 → 0.1.2`.
5. Kaynaktaki sürüm daha yüksekse, örneğin `0.2.0`, bu değer kullanılır. Major/minor geçişini bu şekilde bilinçli olarak belirleyebilirsin. Otomatik akış prerelease sürümlerini baseline olarak kabul etmez.
6. Runner'daki `package.json` ve lockfile birlikte güncellenir. Paket, gerçek GitHub repository URL'si ve `gitHead` kaynak SHA'sını taşır.
7. `npm publish` önce `prepublishOnly` kontrollerini güncellenmiş sürüm üzerinde çalıştırır, sonra OIDC ile npm'e yayımlar.

Sürüm değişikliği yalnızca geçici runner checkout'unda yapılır; `main` branch'ine bot commit'i veya Git tag'i yazılmaz. Bu yüzden kaynak sürüm her patch yayından sonra değişmeyebilir; registry'deki sürüm bir sonraki yayının temelidir. Yayın işlerini bir concurrency kuyruğu sıraya alır; çalışan iş iptal edilmez, en fazla 100 bekleyen çalışma tutulur. Tek push birden fazla commit taşıyorsa push'un en son commit'i için tek sürüm çıkar.

Workflow dışından eşzamanlı manuel yayın yapılırsa npm sürüm çakışmasını reddedebilir. Böyle bir durumda workflow'u yeniden çalıştır; başarılı önceki yayınlar SHA kontrolüyle atlanır. Başarısız npm yayını otomatik olarak farklı bir sürümle tekrar denenmez.

## GitHub ve npm'de tek seferlik kurulum

1. GitHub repository'sini oluştur, bu dosyaları yükle ve çalışma branch'ini `main` olarak kullan.
2. GitHub Settings → Environments altında `npm` environment'ını oluştur ve deployment branch'ini `main` ile sınırla. Tam otomatik yayın istiyorsan required reviewer veya bekleme kuralı ekleme.
3. npm paket ayarlarında Trusted Publisher ekle: gerçek GitHub sahibi/depo adı, workflow dosyası `release.yml`, environment `npm`. Scope/organizasyon üzerinde yayın yetkin olmalı.
4. Paket henüz yoksa ve npm trusted publisher ayarını yalnızca mevcut paket için sunuyorsa ilk sürümü yerelden bir kez yayımla; sonra bu ayarı tamamla. Bu hazırlıkta ilk yayın da yapılmadı.
5. Sonraki `main` push'larında sürüm ve yayın otomatik yönetilir. İlk kurulumdan önceki başarısız çalışmayı da `main` üzerinden yeniden başlatabilirsin.

Workflow npm 11 kullanır, yalnızca yayın işine `id-token: write` verir ve NPM token secret'ı istemez. `main` için branch protection ve gerekli PR kontrollerini GitHub üzerinde yapılandırabilirsin; yerel YAML, hesap/depo ayarlarını kendiliğinden oluşturamaz.

Trusted publishing desteği npm ve CI ortamının gereksinimlerine bağlıdır. Public repository/public paket koşullarında npm provenance üretimini otomatik yapabilir; yerel yayında `provenance` zorunlu etkinleştirilmedi. Bu workflow bu hazırlık sırasında çalıştırılmadı ve registry üzerinde trusted publisher ayarı yapılmadı. GitHub repository ve npm hesap ayarları tamamlanana kadar dosyalar hazır olsa bile gerçek yayın başarılı olamaz.

Resmî kaynaklar: [package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/), [npm pack](https://docs.npmjs.com/cli/commands/npm-pack/), [npm publish](https://docs.npmjs.com/cli/commands/npm-publish/), [scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [trusted publishing](https://docs.npmjs.com/trusted-publishers/).
