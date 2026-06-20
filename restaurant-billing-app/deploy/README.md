Deployment helper files for IIS

- `publish-to-zip.ps1` - builds frontend, assembles a deploy package and creates a ZIP (and optional msdeploy package).

Usage (from repo root):

```powershell
.
restaurant-billing-app\deploy\publish-to-zip.ps1 -OutputZip ..\rbs-deploy.zip
```

Take the created ZIP to your IIS server and extract into the IIS site folder (or use msdeploy if you generated the msdeploy package).

Included helper scripts:

- `install-nssm.ps1` — helper to install the Node backend as a Windows service using NSSM. The publish script will include this helper in the package (tools\install-nssm.ps1) when present alongside `publish-to-zip.ps1`.

Quick `install-nssm.ps1` example (run elevated on the server):

```powershell
.\deploy\install-nssm.ps1 \
	-AppPath 'C:\inetpub\wwwroot\rbs\backend\src\app.js' \
	-AppDirectory 'C:\inetpub\wwwroot\rbs\backend' \
	-EnvString 'PORT=8000;DB_HOST=127.0.0.1;DB_USER=postgres;DB_PASSWORD=your_pw;DB_NAME=restaurant_billing' \
	-StartService
```

Note: `nssm.exe` is not bundled; download it from https://nssm.cc/ and place it on the server PATH or provide `-NssmPath` to the helper.
