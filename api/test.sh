curl -X POST "https://comment-pr.vercel.app/api" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mica",
    "comment": "hoi",
    "path": "comments.yaml"
}'
