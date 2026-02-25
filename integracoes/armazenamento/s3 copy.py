import boto3
from django.conf import settings


class S3StorageService:
    """
    Integração com Amazon S3 ou provedores compatíveis.

    Compatível com:
    ✔ AWS S3
    ✔ Cloudflare R2
    ✔ MinIO
    ✔ DigitalOcean Spaces
    """

    def __init__(self):
        self.bucket = settings.AWS_STORAGE_BUCKET_NAME

        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            endpoint_url=getattr(settings, "AWS_S3_ENDPOINT_URL", None),
            region_name=getattr(settings, "AWS_REGION", None),
        )

    def upload_file(self, file_obj, key: str, content_type=None):
        """
        Upload de arquivo.
        """
        extra = {}
        if content_type:
            extra["ContentType"] = content_type

        self.client.upload_fileobj(
            file_obj,
            self.bucket,
            key,
            ExtraArgs=extra,
        )

        return key

    def download_file(self, key: str):
        """
        Download de arquivo.
        """
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    def delete_file(self, key: str):
        """
        Remove arquivo.
        """
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def generate_presigned_url(self, key: str, expires=3600):
        """
        URL temporária segura.
        """
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )
