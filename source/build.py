"""Build and verify the stable native ZIP/catalog from reviewed local source; no upload."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib,json,zipfile

ROOT=Path(__file__).resolve().parent
PAYLOAD=ROOT/'package'
OUT=ROOT/'release'
OUT.mkdir(exist_ok=True)
read=lambda path:json.loads(path.read_text())
digest=lambda raw:hashlib.sha256(raw).hexdigest()
agent=read(PAYLOAD/'agents.json')[0]
agent['name']='Character Memory Keeper v4.1.11 — Native'
agent['description']='Lossless self-contained checkpoints and bounded admission checks; existing evidence, audience, field and row limits remain strict.'
agent['defaultPromptTemplate']=(ROOT/'Keeper_Prompt_v4.1.11.txt').read_text().strip()
(PAYLOAD/'agents.json').write_text(json.dumps([agent],ensure_ascii=False,indent=2)+'\n')
manifest=read(PAYLOAD/'manifest.json')
manifest.update(name='Personal Keeper v4.1.11 — Lossless Checkpoints and Admission Guards',version='4.1.11',description='Lossless canonical provenance packing and bounded admission checks; fixed 22000 character and existing row/field caps; no archival or model retirement.',builtAgainst={'engineVersion':'2.5.0','engineCommit':'c56501495a8baf76c258e76534c8728a9b7859bb'},entrypoints={'agents':'agents.json','server':'server.mjs','client':'client.js'},contributions={'slots':['roleplay-tracker','tracker-panel']},permissions=['agent-runtime','ui'])
files=['agents.json','client.js','evidence.mjs','keeper-core.mjs','legacy-v4.mjs','server.mjs','sources.mjs','transaction.mjs','scene-boundary.mjs','retention.mjs','provenance.mjs','plan-guards.mjs','storage.mjs','admission.mjs']
manifest['files']=[{'path':name,'sha256':digest((PAYLOAD/name).read_bytes()),'bytes':(PAYLOAD/name).stat().st_size} for name in files]
(PAYLOAD/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
artifact=OUT/'personal-character-memory-v4-1-4.1.11.zip'
with zipfile.ZipFile(artifact,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for name in ['manifest.json',*files]:
        info=zipfile.ZipInfo(name,date_time=(2026,10,19,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
        archive.writestr(info,(PAYLOAD/name).read_bytes())
raw=artifact.read_bytes()
base='https://raw.githubusercontent.com/Gaia999999999/personal-marinara-keeper/main/'
catalog={'schemaVersion':1,'generatedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'packages':[{'manifest':manifest,'category':'tracker','artifact':{'url':base+artifact.name,'sha256':digest(raw),'bytes':len(raw)}}],'provenance':{'kind':'custom','url':base+'catalog.json'}}
(OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
checks=[]
def ck(name,condition):
    checks.append({'name':name,'passed':bool(condition)})
    assert condition,name
ck('same native package/agent identity',manifest['id']==agent['id']=='personal-character-memory-v4-1')
ck('matching displayed stable version',agent['name']=='Character Memory Keeper v4.1.11 — Native')
ck('explicit stable release version',manifest['version']=='4.1.11')
ck('pinned host and capability contract',manifest['capabilityApi']=={'major':1,'minor':14} and manifest['engine']=={'min':'2.5.0','maxExclusive':'2.5.1'})
ck('UI and runtime permissions only',manifest['permissions']==['agent-runtime','ui'])
ck('one native post-processing agent',agent['phase']=='post_processing' and not agent['enabledByDefault'] and agent['modeAllowlist']==['roleplay'])
s=agent['defaultSettings']
ck('24-message supply pool; output cap unchanged',s['contextSize']==24 and s['maxTokens']==8888 and s['runInterval']==1)
ck('optional context is disabled; host still repeats the assistant response',not any(s['contextSources'].values()) and not s['includePreGenInjections'] and not s['includeParallelResults'] and not s['triggerLorebooksForAgentCalls'] and s['enabledTools']==[])
ck('text result publication contract',s['jsonContextOutput'] is False and s['injectAsSection'] is True and s['hideOutput'] is True)
ck('packaged prompt equals reviewed prompt',agent['defaultPromptTemplate']==(ROOT/'Keeper_Prompt_v4.1.11.txt').read_text().strip())
with zipfile.ZipFile(artifact) as archive:
    ck('only declared runtime payload is shipped',set(archive.namelist())=={'manifest.json',*files})
    for f in manifest['files']:
        data=archive.read(f['path'])
        ck('payload integrity: '+f['path'],data==(PAYLOAD/f['path']).read_bytes() and len(data)==f['bytes'] and digest(data)==f['sha256'])
ck('stable catalog targets main',base=='https://raw.githubusercontent.com/Gaia999999999/personal-marinara-keeper/main/')
ck('catalog points to exact ZIP',catalog['packages'][0]['artifact']['sha256']==digest(artifact.read_bytes()))
report={'allPassed':True,'passed':len(checks),'artifact':artifact.name,'bytes':len(raw),'sha256':digest(raw),'checks':checks,'scope':'Local packaging/reference/integrity checks. Full live host and provider execution remain the Pinewatch gate.'}
(OUT/'ASSET_VERIFICATION.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
