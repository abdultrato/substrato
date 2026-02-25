import boto3
from django.conf import settings


class BackblazeStorageService:
    """
    Integração com Backblaze B2 (S3 Compatible).
    Excelente custo-benefício para arquivos médicos.
    """

    def __init__(self):
        self.bucket = settings.B2_BUCKET_NAME

        self.client = boto3.client(
            "s3",
            endpoint_url=settings.B2_ENDPOINT,
            aws_access_key_id=settings.B2_KEY_ID,
            aws_secret_access_key=settings.B2_APPLICATION_KEY,
        )

    def upload_file(self, file_obj, key: str):
        self.client.upload_fileobj(file_obj, self.bucket, key)
        return key

    def download_file(self, key: str):
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    def delete_file(self, key: str):
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def generate_presigned_url(self, key: str, expires=3600):
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )
