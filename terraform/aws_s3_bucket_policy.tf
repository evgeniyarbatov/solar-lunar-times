resource "aws_s3_bucket_policy" "allow_public_access" {
  bucket = aws_s3_bucket.bucket.bucket

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPublicRead"
        Effect = "Allow"
        Principal = "*"

        Action = "s3:GetObject"

        Resource = "${aws_s3_bucket.bucket.arn}/*"
      }
    ]
  })
}