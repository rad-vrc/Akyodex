export const onRequest = async (context) => {
    const url = new URL(context.request.url);
    // 本番用 preview ドメインのみをリダイレクト対象に限定（他 preview は残す）
    if (url.hostname === 'akyodex.pages.dev') {
        const target = `https://akyodex.com${url.pathname}${url.search}`;
        // 302にしてデバッグ/プレビュー時のキャッシュ固着を避ける
        return Response.redirect(target, 302);
    }
    return context.next();
};


