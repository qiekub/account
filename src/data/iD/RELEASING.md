## Release Checklist

### Prerelease (several days prior)
- Notify translators of impending release
  (https://www.transifex.com/projects/p/id-editor/announcements/)
- Notify TomH

### Prep
- If you don't have a `transifex.auth` file in the root of your iD checkout,
you'll need to create a Transifex account, ask @bhousel for admin rights
on the iD project, and then create this file with contents like<br><pre>
     {"user": "yourusername", "password": "*******"}</pre>This file is not version-controlled and will not be checked in.

### Update `iD`

#### Update `develop` branch
```bash
$  git checkout develop
$  rm -rf node_modules/editor-layer-index/
$  npm install
$  npm run imagery
$  npm run all
$  git add . && git commit -m 'npm run imagery'
$  npm run translations
$  git add . && git commit -m 'npm run translations'
```

- Update `CHANGELOG.md`
- Update version number in `modules/core/context.js`, `package.json`

```bash
$  git add . && git commit -m 'vA.B.C'
$  git push origin develop
```

#### Update and tag `release` branch
```bash
$  git checkout release
$  git reset --hard develop
$  npm run all
$  git add -f dist/*.css dist/*.js dist/data/* dist/img/*.svg dist/mapillary-js/ dist/pannellum-streetside/
$  git commit -m 'Check in build'
$  git tag vA.B.C
$  git push origin -f release vA.B.C
```
- Open https://github.com/openstreetmap/iD/tags
- Click `•••` –> `Create Release` and link to `CHANGELOG.md` in `Describe this release`

### Update `openstreetmap-website`

#### Setup remotes (first time only)
```bash
$  git remote add osmlab git@github.com:osmlab/openstreetmap-website.git
$  git remote add upstream git@github.com:openstreetmap/openstreetmap-website.git
```

#### Sync develop branches

```bash
$  git fetch --all
$  git checkout develop
$  git reset --hard upstream/develop
$  git push osmlab develop
```

#### Create and push branch with the new iD version

```bash
$  git checkout -b iD-A.B.C
$  bundle install
$  rm -rf vendor/assets/iD/* && vendorer
$  git add . && git commit -m 'Update to iD vA.B.C'
$  git push osmlab
```
- [Open a pull request](https://github.com/openstreetmap/openstreetmap-website/compare/develop...osmlab:develop) using the [markdown text from the changelog](https://raw.githubusercontent.com/openstreetmap/iD/develop/CHANGELOG.md) as the description
