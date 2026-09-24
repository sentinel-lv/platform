"""OTA artifact registry (backend README Phase 4): signed firmware images.

Upload records version + sha256 + signature; download serves the bytes back
only when the stored sha256 still matches (tamper-evident). Signature
verification against the release key happens at the gateway before flashing
(gateway pulls over mutually-authenticated TLS); the server records, never
trusts blindly. Images live under var/ota (demo) — object storage in prod.
"""
import hashlib
import pathlib

ROOT = pathlib.Path("var/ota")

class OtaRegistry:
    def __init__(self, root=ROOT):
        self.root = pathlib.Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.meta: dict[str, dict] = {}

    def publish(self, version: str, image: bytes, signature: str) -> dict:
        digest = hashlib.sha256(image).hexdigest()
        (self.root / f"{version}.bin").write_bytes(image)
        self.meta[version] = {"version": version, "sha256": digest,
                              "size": len(image), "signature": signature}
        return self.meta[version]

    def fetch(self, version: str) -> tuple[bytes, dict]:
        if version not in self.meta:
            raise ValueError(f"unknown version {version!r}")
        blob = (self.root / f"{version}.bin").read_bytes()
        if hashlib.sha256(blob).hexdigest() != self.meta[version]["sha256"]:
            raise ValueError("image failed integrity check")
        return blob, self.meta[version]

    def versions(self) -> list[str]:
        return sorted(self.meta)
