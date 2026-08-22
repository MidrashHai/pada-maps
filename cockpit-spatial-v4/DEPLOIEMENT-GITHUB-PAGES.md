# Cockpit Spatial™ v4.0 — déploiement GitHub Pages

## Emplacement dans le dépôt PADA-cartes

Tous les fichiers du Cockpit sont isolés dans :

```text
/cockpit-spatial-v4/
```

L'application PADA-cartes et le `CNAME` existants ne sont pas remplacés.

## Fichiers du sous-dossier

- `.nojekyll`
- `index.html`
- `5-cockpit-spatial-v3_1_stable 20 av soir - 3 Aout 2026.html`
- `cockpit-spatial-mobile-v4.css`
- `territorial-anchor-data-v0.1.js`
- `territorial-anchor-resolver-v0.3.js`
- `zera-fixed-coordinate-registry-v0.1.js`
- `zera-address-domain-overrides-v0.1.js`
- `zera-address-domain-registry-v0.1.js`
- `omeh-destination-proximity-resolver-v0.1.js`
- `qedimah-territorial-potential-v0.1.js`
- `icl-constitution-engine-v2.2.js`

Conserver exactement les noms et placer tous ces fichiers dans le même dossier.

## Activer GitHub Pages

Après fusion de la branche et publication habituelle de PADA-cartes, ouvrir :

```text
https://maps.addressme.ci/cockpit-spatial-v4/
```

## Premier test mobile

1. Ouvrir l'adresse HTTPS sur le téléphone.
2. Autoriser la localisation précise dans le navigateur et dans les réglages du téléphone.
3. Désactiver, si possible, l'économie d'énergie pendant le test.
4. Ouvrir **Localisation** : le mode GPS est sélectionné automatiquement sur mobile.
5. Appuyer sur **Position GPS en direct**, rester immobile, puis valider.
6. Exporter la session après plusieurs prises.

GitHub Pages doit être utilisé en HTTPS : la géolocalisation du navigateur mobile peut être bloquée sur une page HTTP ordinaire.
