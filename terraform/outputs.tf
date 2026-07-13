output "url" {
  value = "https://${var.s3_bucket}"
}

output "public_url" {
  value = "http://${aws_s3_bucket.bucket.bucket}.s3-website-${data.aws_region.current.id}.amazonaws.com"
}
